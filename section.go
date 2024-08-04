package apixt

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
	return n.html + `{"cmd": 2}` + "\n"
}

func (n *SectionNode) getParent() int {
	return n.parent
}

func NewSectionNode(title string, parent int) *SectionNode {
	content := `{"cmd": 1, "name": "` + title + `"}` + "\n"
	return &SectionNode{content, parent, false}
}
