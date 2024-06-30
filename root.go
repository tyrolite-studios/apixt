package crowner

// --- Root Node ----

type rootNode struct {
	html   string
	closed bool
}

func (n *rootNode) getType() string {
	return `root`
}

func (n *rootNode) isBlock() bool {
	return false
}

func (n *rootNode) isClosed() bool {
	return n.closed
}

func (n *rootNode) getParent() int {
	return -1
}

func (n *rootNode) add(content string) {
	n.html += content
}

func (n *rootNode) end() string {
	n.closed = true
	return n.html
}

func NewRootNode() *rootNode {
	return &rootNode{}
}
