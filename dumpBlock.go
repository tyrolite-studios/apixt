package apixt

// --- Dump Block ----

type DumpBlockNode struct {
	html   string
	hash   string
	parent int
	closed bool
}

var DumpBlockNodeType string = "DumpBlockNode"

func (n *DumpBlockNode) isBlock() bool {
	return true
}

func (n *DumpBlockNode) getType() string {
	return DumpBlockNodeType
}

func (n *DumpBlockNode) add(content string) {
	if !n.closed {
		n.html += content
	}
}

func (n *DumpBlockNode) getParent() int {
	return n.parent
}

func (n *DumpBlockNode) isClosed() bool {
	return n.closed
}

func (n *DumpBlockNode) end() string {
	n.closed = true
	return n.html + `}` + "\n"
}

func (n *DumpBlockNode) panicIf(haltHash string) bool {
	return haltHash != "" && haltHash == n.hash
}

func getFooterHtml(footer []pair, isError bool) string {

	footerHtml := ""
	if isError {
		footerHtml += `, "isError": true`
	}
	if len(footer) > 0 {
		footerHtml += `, "footer": {`
		i := 1
		for _, value := range footer {
			if i > 1 {
				footerHtml += ", "
			}
			footerHtml += SplitString(value[0]) + `: ` + SplitString(value[1])
			i++
		}
		footerHtml += `}`
	}
	return footerHtml
}

type blockOptions struct {
	parent  int
	id      string
	isError bool
	footer  []pair
}

func NewDumpBlockNode(title, inner string, options blockOptions) *DumpBlockNode {
	var hash string
	if options.id != "" {
		hash = options.id
	} else {
		hash = generateHash(inner)
	}
	content := `{"cmd": 6, "name": "` + title + `", "mime": "text/json", "html": ` + SplitString(inner) + `, "hash": "` + hash + `" `
	n := DumpBlockNode{content, hash, options.parent, false}
	return &n
}
