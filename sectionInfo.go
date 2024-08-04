package apixt

// ---- Section Info Node ----

type SectionInfoNode struct {
	html   string
	parent int
	closed bool
}

var SectionInfoNodeType string = "SectionInfoNode"

func (n *SectionInfoNode) isBlock() bool {
	return false
}

func (n *SectionInfoNode) isClosed() bool {
	return n.closed
}

func (n *SectionInfoNode) getType() string {
	return SectionInfoNodeType
}

func (n *SectionInfoNode) add(content string) {
	if !n.closed {
		n.html += content
	}
}

func (n *SectionInfoNode) end() string {
	n.closed = true
	return n.html + `{"cmd": 4}` + "\n"
}

func (n *SectionInfoNode) getParent() int {
	return n.parent
}

func NewSectionInfoNode(parent int) *SectionInfoNode {
	content := `{"cmd": 3}` + "\n"
	return &SectionInfoNode{content, parent, false}
}
