import { useModalWindow } from "./modal"
import { Button } from "./form"
import { useContext, useRef, useEffect, useState } from "react"
import { getStringifiedJSON } from "../util"
import { ClassNames } from "../core/helper"
import { d } from "../core/helper"
import { AppContext } from "./context"
import { Centered } from "./layout"
import { DualRing } from "./common"

function ContentTree({ root, level = 1 }) {
    const { type, nodes, ...params } = root

    const nextLevel = type === "section" ? level + 1 : level
    const children = []
    if (nodes) {
        let i = 0
        for (const node of nodes) {
            children.push(
                <ContentTree
                    key={nextLevel + "_" + i}
                    root={node}
                    level={nextLevel}
                />
            )
            i++
        }
    }
    switch (type) {
        case "root":
            return <div className="stack-v gap-2">{children}</div>

        case "section":
            return (
                <Section {...params} primary={nextLevel % 2 === 1}>
                    {children}
                </Section>
            )

        case "section-group":
            return <SectionGroup {...params}>{children}</SectionGroup>

        case "code-block":
            return <CodeBlock {...params} />

        case "dump-block":
            return <DumpBlock {...params} />

        case "status":
            return <StatusBlock {...params} />

        case "loading":
            return <LoadingBlock />

        case "error":
            return <ErrorBlock {...params} />

        default:
            throw Error(`Unknown node type "${type}" given!`)
    }
}

function ErrorBlock({ msg }) {
    const aCtx = useContext(AppContext)
    return (
        <div className="bg-warning-bg text-warning-text py-1 px-2 border border-header-border">
            <div className="stack-h gap-2 full-h">
                <div># Error: {msg}</div>
                <div className="auto" />
                <Button name="Retry" onClick={aCtx.restartContentStream} />
                <Button name="Clear" onClick={aCtx.clearContent} />
            </div>
        </div>
    )
}

function StatusBlock() {
    const aCtx = useContext(AppContext)
    return (
        <div className="bg-header-bg text-header-text py-1 px-2 border border-header-border">
            <div className="stack-h gap-2 full-h">
                <div># Aborted</div>
                <div className="auto" />
                <Button name="Retry" onClick={aCtx.restartContentStream} />
                <Button name="Clear" onClick={aCtx.clearContent} />
            </div>
        </div>
    )
}

function Section({ name, children, primary = false }) {
    const [colapsed, setColapsed] = useState(false)

    const cls = new ClassNames("px-2 border shadow-xl pt-1 pb-2")
    cls.addIf(
        primary,
        "border-frame-odd-border bg-frame-odd-bg text-frame-odd-text",
        "border-frame-even-border bg-frame-even-bg text-frame-even-text"
    )

    const toggle = () => {
        setColapsed(!colapsed)
    }

    const contentCls = new ClassNames(
        "stack-v bg-app-bg text-app-text border border-frame-odd-border p-2 gap-2"
    )
    contentCls.addIf(colapsed, "colapsed")
    return (
        <div className={cls.value}>
            <div className="stack-h gap-2">
                <div
                    className="bg-frame-odd-border text-frame-odd-bg px-2 py-0"
                    onClick={toggle}
                >
                    <div>
                        <span>{colapsed ? "+" : "-"}</span>
                    </div>
                </div>
                <div className="auto full text-left">
                    <div className="inline-block align-top text-xs">{name}</div>
                </div>
            </div>

            <div className={contentCls.value}>{children}</div>
        </div>
    )
}

function SectionGroup({ children }) {
    return (
        <div className="p-2 border border-dashed border-app-text hideable">
            {children}
        </div>
    )
}

function DumpBlock({ name, vars }) {
    return (
        <>
            <div className="stack-v gap-1">
                <pre className="bg-header-bg/70 px-2 py-0 text-app-bg">
                    {name}
                </pre>
                <div className="grid overflow-auto grid-cols-[min-content_min-content] gap-y-1">
                    <div className="text-xs text-header-bg px-2 text-right">
                        string
                    </div>
                    <pre className="dumparea px-2 text-xs text-block-header-text">
                        "Here is my dump"
                    </pre>
                    <div className="text-xs text-header-bg px-2 text-right">
                        int
                    </div>
                    <pre className="dumparea px-2 text-xs text-block-header-text">
                        666
                    </pre>
                </div>
            </div>
        </>
    )
}

function CodeBlock({ name, html, hash }) {
    const [colapsed, setColapsed] = useState(false)
    const reload = (target) => console.log("reload", target)
    const toggle = () => {
        setColapsed(!colapsed)
    }
    const contentCls = new ClassNames("auto p-2")
    contentCls.addIf(colapsed, "colapsed")
    return (
        <div className="border border-block-border text-block-header-text bg-block-header-bg">
            <div className="stack-h px-2 py-1">
                <div className="title auto text-left">{name}</div>
                <div className="stack-h">
                    <Button name=" ◼ STOP HERE" onclick={() => reload(hash)} />
                </div>
            </div>

            <div className="stack-h bg-block-bg text-block-text">
                <div className="py-1 px-1 bg-block-header-bg/20">
                    <Button
                        icon={
                            colapsed
                                ? "keyboard_arrow_down"
                                : "keyboard_arrow_up"
                        }
                        className="!px-2 py-1 px-1"
                        onClick={toggle}
                    />
                </div>
                <div
                    className={contentCls.value}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>

            <div className="text-block-footer-text bg-block-footer-bg px-2 py-1 text-xs border border-t border-b-0 border-x-0 border-block-border/20">
                <span className="text-block-footer-text/50">Content-Type:</span>{" "}
                text/json
            </div>
        </div>
    )
}

function LoadingBlock({}) {
    return (
        <div className="p-2 border border-app-text text-center text-app-text/50">
            <div className="stack-h text-center justify-center gap-2">
                <DualRing size={20} className="after:border-1" />
                <div>Loading...</div>
            </div>
        </div>
    )
}

function Content() {
    const aContext = useContext(AppContext)
    const [tree, setTree] = useState(null)
    const contentRef = useRef(null)

    useEffect(() => {
        aContext.treeBuilder.setTreeSetter(setTree)
    }, [])

    /*
    const len = tree ? tree.nodes.length : -1
    useEffect(() => {
        if (!isLoading || !contentRef.current) return

        contentRef.current.scrollTop = contentRef.current.scrollHeight
    }, [len])
    */

    if (!tree)
        return (
            <Centered className="text-app-text text-sm">
                Start a new request...
            </Centered>
        )

    return (
        <div
            ref={contentRef}
            className="stack-v gap-2 auto text-sm p-2 overflow-auto"
        >
            <ContentTree root={tree} />
        </div>
    )
}

export { Section, Content }
