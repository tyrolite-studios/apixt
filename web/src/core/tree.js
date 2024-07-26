class TreeBuilder {
    constructor() {
        this.reset()
    }

    reset() {
        this.tree = null
        this.stack = [{ type: "tree", nodes: [] }]
    }

    getLastNode() {
        const len = this.stack.length
        if (!len) throw Error(`Foo`)

        return this.stack[len - 1]
    }

    addNode(node, assertType = null) {
        if (assertType && node.type !== assertType) throw Error(``)

        const parent = this.getLastNode()
        if (!parent.nodes) throw Error(`Bla`)

        parent.nodes.push(node)
    }

    addCmd({ cmd, ...props }) {
        switch (cmd) {
            case "startSection":
                this.stack.push({ type: "section", ...props })
                break

            case "closeSection": {
                const last = this.stack.pop()
                this.addNode(last, "section")
                break
            }

            case "openSectionGroup":
                this.stack.push({ type: "section-group", ...props })
                break

            case "closeSectionGroup": {
                const last = this.stack.pop()
                this.addNode(last, "section-group")
                break
            }

            case "addDump": {
                this.addNode({ type: "dump-block", ...props })
                break
            }

            case "addCodeBlock": {
                this.addNode({ type: "code-block", ...props })
            }
        }
    }

    get tree() {
        return {
            type: "root",
            children: this.nodes
        }
    }
}

const builder = new TreeBuilder()

export default TreeBuilder
