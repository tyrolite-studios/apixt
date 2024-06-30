package crowner

import (
	"fmt"
	"html"
	"io"
	"net/http"
	"runtime"
	"sync"
)

type node interface {
	getType() string
	isBlock() bool
	isClosed() bool
	getParent() int
	add(string)
	end() string
}

// ---- Async DumpTree ----
type dmpTree struct {
	IsActive      bool
	nodes         []node
	size          int
	html          string
	queryHash     string
	stoppedAtHash string
	stopNext      uint8
	closed        bool
	timers        *Timers
	abortChan     chan bool
	mu            sync.Mutex
}

func (dt *dmpTree) abort() {
	dt.abortChan <- true
}

// adding is always possible, but node must have a parent-index
func (dt *dmpTree) addNode(n node, lock bool) int {
	if !dt.IsActive || dt.closed {
		return 0
	}
	if lock {
		dt.mu.Lock()
		defer dt.mu.Unlock()
	}
	parent := n.getParent()
	if parent < dt.size && (dt.nodes[parent]).isBlock() {
		panic(`Trying to add a child to a block node`)
	}
	index := len(dt.nodes)
	dt.nodes = append(dt.nodes, n)
	dt.size++

	return index
}

func (dt *dmpTree) closeNode(index int, lock bool, checkType *string) error {
	if !dt.IsActive || dt.closed {
		return nil
	}
	if lock {
		dt.mu.Lock()
		defer dt.mu.Unlock()
	}
	if index > len(dt.nodes) {
		return fmt.Errorf("Invalid node index %d in dump tree", index)
	}
	n := dt.nodes[index]
	if checkType != nil && n.getType() != *checkType {
		return fmt.Errorf("Cannot close debug element: expected %s bug got %s!", *checkType, n.getType())
	}
	if n.isClosed() {
		return nil
	}

	parent := n.getParent()
	if parent > -1 {
		dt.nodes[parent].add(n.end())
	} else {
		dt.html += n.end()
	}
	return nil
}

func (dt *dmpTree) closeAll() {
	if !dt.IsActive || dt.closed {
		return
	}
	dt.mu.Lock()
	defer dt.mu.Unlock()

	for i := len(dt.nodes) - 1; i >= 0; i-- {
		_ = dt.closeNode(i, false, nil)
	}
	nextHash := STOP_NEXT_PREFIX + dt.stoppedAtHash
	dt.html +=
		`<div class="navbox haltbox">
			<div class="info">Dump haltet at "` + dt.stoppedAtHash + `"</div>
			<div class="">
				<button onclick="reload('` + nextHash + `')">STOP AT NEXT</button>
				<button onclick="reload('')">CONTINUE</button>
			</div>
		</div>`
	dt.closed = true
}

func (dt *dmpTree) checkHalt(n *DumpBlockNode) {
	doPanic := dt.stopNext == 2
	if !doPanic && n.panicIf(dt.queryHash) {
		if dt.stopNext == 0 {
			doPanic = true
		} else {
			dt.stopNext++
		}
	}
	if doPanic {
		dt.stoppedAtHash = n.hash
		dt.closeAll()
		dt.abort()
	}
}

func (dt *dmpTree) startDumpBlock(title, dump string, options blockOptions) int {
	if !dt.IsActive || dt.closed {
		return 0
	}
	b := NewDumpBlockNode(title, dump, blockOptions{options.parent, options.id, false, []pair{}})
	idx := dt.addNode(b, true)
	dt.checkHalt(b)
	return idx
}

func (dt *dmpTree) endDumpBlock(idx int, options blockOptions) {
	if !dt.IsActive || dt.closed {
		return
	}
	n := dt.nodes[idx]
	n.add(getFooterHtml(options.footer, options.isError))
	dt.closeNode(idx, true, nil)
}

func (dt *dmpTree) addDumbBlock(title, dump string, options blockOptions) {
	if !dt.IsActive || dt.closed {
		return
	}
	dt.mu.Lock()

	b := NewDumpBlockNode(title, dump, blockOptions{options.parent, options.id, false, []pair{}})
	idx := dt.addNode(b, false)

	b.add(getFooterHtml(options.footer, options.isError))
	dt.closeNode(idx, false, nil)
	dt.mu.Unlock()
	dt.checkHalt(b)
}

func (dt *dmpTree) StartSectionInfo(parent int) int {
	if !dt.IsActive || dt.closed {
		return 0
	}
	return dt.addNode(NewSectionInfoNode(parent), true)
}

func (dt *dmpTree) EndSectionInfo(idx int) {
	if !dt.IsActive || dt.closed {
		return
	}
	dt.closeNode(idx, true, &SectionInfoNodeType)
}

func (dt *dmpTree) StartSection(title string, parent int) int {
	if !dt.IsActive || dt.closed {
		return 0
	}
	return dt.addNode(NewSectionNode(title, parent), true)
}

func (dt *dmpTree) EndSection(idx int) {
	if !dt.IsActive || dt.closed {
		return
	}
	dt.closeNode(idx, true, &SectionNodeType)
}

func (dt *dmpTree) getHtml() string {
	if dt.closed {
		return dt.html
	}
	return dt.nodes[0].end()
}

func (dt *dmpTree) d(args ...interface{}) {
	if !dt.IsActive || dt.closed {
		return
	}
	name := "d"
	info := `<pre class="dumpheader">`
	for i := 2; i < 5; i++ {
		pc, file, line, ok := runtime.Caller(i)
		if ok {
			fn := runtime.FuncForPC(pc).Name()
			if i == 2 {
				info += fmt.Sprintf("%s:%d %s() <- %s()", file, line, name, fn)
			} else {
				info += fmt.Sprintf(" <- %s()", name)
			}
			if fn == "main.main" {
				break
			}
		}
	}
	info += `</pre>`
	for _, x := range args {
		ox := x
		switch x.(type) {
		case string:
			x = fmt.Sprintf(`"%s"`, x)
		case nil:
			x = "nil"
		default:
			x = fmt.Sprint(x)
		}
		info += fmt.Sprintf(`<div class="dumpcell"><div class="dumptype">%T</div><pre class="dumparea">%s</pre></div>`, ox, x)
	}

	dt.mu.Lock()
	defer dt.mu.Unlock()

	for i := len(dt.nodes) - 1; i >= 0; i-- {
		n := dt.nodes[i]
		if n.isClosed() || n.isBlock() {
			continue
		}
		n.add(info)
		break
	}
}

func (dt *dmpTree) StartTimer(name string) int {
	return dt.timers.start(name)
}

func (dt *dmpTree) StopTimer(name string) {
	dt.timers.stop(name)
}

func (dt *dmpTree) Durations() []timeResult {
	return dt.timers.results()
}

func (dt *dmpTree) Get(url string, parent int) (*http.Response, error) {
	s0 := dt.StartSection("HTTP Request", parent)
	db := dt.startDumpBlock("URL", `<pre class="code"><a href="`+url+`" target="_blank">`+html.EscapeString(url)+`</a></pre>`, blockOptions{parent: s0})
	dt.StartTimer("Http-Requests")
	defer dt.StopTimer("Http-Requests")
	resp, err := http.Get(url)
	if err != nil {
		return resp, err
	}
	defer resp.Body.Close()
	contentLength := resp.Header.Get("Content-Length")
	dt.endDumpBlock(db, blockOptions{isError: resp.StatusCode >= 400, footer: []pair{
		{"Status", fmt.Sprintf("%d", resp.StatusCode)},
		{"Content-type", resp.Header.Get("Content-type")},
		{"Content-length", contentLength},
	}})
	i1 := dt.StartSectionInfo(s0)
	dt.addDumbBlock("Response-Header", getHeaderDump(resp.Header), blockOptions{parent: i1})
	body, err := io.ReadAll(resp.Body)
	dt.addDumbBlock("Response-Body", "<pre class=\"code\">"+html.EscapeString(string(body))+"</pre>", blockOptions{parent: i1})
	dt.EndSectionInfo(i1)
	dt.EndSection(s0)

	return resp, nil
}

func NewDumpTree(r *http.Request) *dmpTree {
	queryHash := r.URL.Query().Get("dump")
	stopNext := uint8(0)
	if queryHash != "" && queryHash[0:1] == STOP_NEXT_PREFIX {
		queryHash = queryHash[1:]
		stopNext = 1
	}
	return &dmpTree{
		nodes:     []node{NewRootNode()},
		size:      1,
		queryHash: queryHash,
		stopNext:  stopNext,
		timers:    NewTimers(),
	}
}
