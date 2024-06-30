package crowner

import (
	"html"
)

// --- Section Node -----

type SectionNode struct {
	html   string
	parent int
	closed bool
}

var SectionNodeType string = "SectionNode"

func (n *SectionNode) isBlock() bool {
	return false
}

func (n *SectionNode) isClosed() bool {
	return n.closed
}

func (n *SectionNode) getType() string {
	return SectionNodeType
}

func (n *SectionNode) add(content string) {
	if !n.closed {
		n.html += content
	}
}

func (n *SectionNode) end() string {
	n.closed = true
	return n.html + "</div></div>"
}

func (n *SectionNode) getParent() int {
	return n.parent
}

func NewSectionNode(title string, parent int) *SectionNode {
	content :=
		`<div class="dumpsection level_odd extended">
			<div class="sectionheader" onclick="toggleSessionBlock(this)">
				<div class="toggler">
					<div><span></span></div>
				</div>
				<div class="sectiontitle"><span class="section-name">` + html.EscapeString(title) + `</span></div>
    		</div>
    
			<div class="sectioncontent">`
	return &SectionNode{content, parent, false}
}
