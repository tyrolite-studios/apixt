import { d, isObject } from "./helper"

const CMD = {
    OPEN_SECTION: 1,
    CLOSE_SECTION: 2,
    OPEN_SECTION_DETAILS: 3,
    CLOSE_SECTION_DETAILS: 4,
    ADD_DUMP: 5,
    ADD_CODE_BLOCK: 6,
    HALT: 7,
    END: 0
}

const STATE = {
    WAITING: 0,
    STREAMING: 1,
    FINISHED: 2,
    CANCELED: 3,
    ERRORED: 4
}

class TreeBuilder {
    constructor() {
        this.reset()
        this.treeSetter = null
    }

    reset() {
        this.aborted = false
        this.ended = false
        this.error = null
        this.state = STATE.WAITING
        this.cmdQueue = []
        this.nodes = []
        this.stack = []
        this.updateRenderer()
    }

    setTreeSetter(setter) {
        this.treeSetter = setter
    }

    getLastNode() {
        const len = this.stack.length
        if (!len) return null

        return this.stack[len - 1]
    }

    addNode(node, assertType = null) {
        if (assertType && node.type !== assertType)
            throw Error(
                `Type mismatch while adding: expected "${assertType}" but got "${node.type}"`
            )

        const parent = this.getLastNode()
        if (!parent) {
            this.nodes.push(node)
            this.updateRenderer()
            return
        }
        if (!parent.nodes)
            throw Error(
                `The parent node is of type "${parent.type}" and cannot have ${node.type} as child`
            )

        parent.nodes.push(node)
    }

    setState(state) {
        this.state = state
        this.updateRenderer()
    }

    processStream({ fetchPromise, isAborted, abort }) {
        const promise = new Promise(async (resolve, reject) => {
            this.setState(STATE.STREAMING)

            const processLine = (line) => {
                const cmd = JSON.parse(line)
                if (!isObject(cmd))
                    throw Error(`Expected object but got "${cmd}"`)

                this.processCmd(cmd)
            }

            try {
                const reader = await fetchPromise.then((response) => response)

                const decoder = new TextDecoder()
                let buffer = ""
                while (true) {
                    const { value, done } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    let lines = buffer.split("\n")
                    buffer = lines.pop()

                    for (let line of lines) {
                        if (line) {
                            processLine(line)
                        }
                    }
                }
                if (buffer) {
                    processLine(buffer)
                }
                if (this.ended) {
                    this.setState(STATE.FINISHED)
                }
            } catch (e) {
                this.error = e.message
                this.setState(STATE.ERRORED)
            }
            resolve()
        })

        return promise
    }

    processCmd({ cmd, ...props }) {
        switch (cmd) {
            case CMD.OPEN_SECTION:
                this.stack.push({ type: "section", nodes: [], ...props })
                break

            case CMD.CLOSE_SECTION: {
                const last = this.stack.pop()
                this.addNode(last, "section")
                break
            }

            case CMD.OPEN_SECTION_DETAILS:
                this.stack.push({ type: "section-group", nodes: [], ...props })
                break

            case CMD.CLOSE_SECTION_DETAILS: {
                const last = this.stack.pop()
                this.addNode(last, "section-group")
                break
            }

            case CMD.ADD_DUMP: {
                this.addNode({ type: "dump-block", ...props })
                break
            }

            case CMD.ADD_CODE_BLOCK: {
                this.addNode({ type: "code-block", ...props })
                break
            }

            case CMD.HALT: {
                this.addNode({ type: "halt", ...props })
                break
            }

            case CMD.END: {
                this.ended = true
                break
            }

            default: {
                throw Error(`Unknown command "${cmd}" given!`)
            }
        }
    }

    abort() {
        if (this.ended) return

        this.setState(STATE.CANCELED)
    }

    updateRenderer() {
        if (!this.treeSetter) return

        if (this.state === STATE.WAITING) {
            this.treeSetter(null)
            return
        }

        const nodes = [...this.nodes]
        if (this.state === STATE.ERRORED) {
            nodes.push({ type: "error", status: "error", msg: this.error })
        } else if (this.state === STATE.CANCELED) {
            nodes.push({ type: "status", status: "aborted" })
        } else if (this.state === STATE.STREAMING) {
            nodes.push({ type: "loading" })
        }
        this.treeSetter({
            type: "root",
            nodes
        })
    }
}

const treeBuilder = new TreeBuilder()

export { CMD, treeBuilder }
