package apixt

import (
	"html"
)

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
	return n.html + "</div>"
}

func (n *DumpBlockNode) panicIf(haltHash string) bool {
	return haltHash != "" && haltHash == n.hash
}

func getFooterHtml(footer []pair, isError bool) string {
	footerHtml := ""
	if len(footer) > 0 {
		footerHtml += `<div class="footer`
		if isError {
			footerHtml += ` error`
		}
		footerHtml += `">`
		i := 1
		for _, value := range footer {
			footerHtml += ` <span class="footerkey">` + value[0] + `:</span> <span class="footervalue">` + value[1] + `</span>`
			if i < len(footer) {
				footerHtml += ` <span class="footerseparator">|</span>`
			}
			i++
		}
		footerHtml += `</div>`
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
	content :=
		`<div class="dumpbox">
		<div class="header">
			<div class="title">` + html.EscapeString(title) + `</div>
			<div><button onclick="reload('` + hash + `')"><nobr> ◼ STOP HERE</nobr></button> </div>
		</div>

		<div class="center">
			<div class="collapser" onclick="toggleCodeBlock(this)">
				<div><span></span></div>
			</div>
			<div class="dumpcode">` + inner + `</div>
		</div>`

	n := DumpBlockNode{content, hash, options.parent, false}
	return &n
}
