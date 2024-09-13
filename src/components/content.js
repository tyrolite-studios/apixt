import { Button, ButtonGroup } from "./form"
import { useContext, useRef, useEffect, useState, Fragment } from "react"
import { ClassNames, isObject, isArray } from "core/helper"
import { d } from "core/helper"
import { AppContext } from "./context"
import { Centered, Div } from "./layout"
import { DualRing } from "./common"
import { PluginRegistry } from "core/plugin"

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

        case "halt":
            return <HaltBlock {...params} />

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
    const aContext = useContext(AppContext)
    return (
        <div className="bg-warning-bg text-warning-text py-1 px-2 border border-header-border">
            <div className="stack-h gap-2 full-h">
                <div># Error: {msg}</div>
                <div className="auto" />
                <Button
                    name="Retry"
                    onPressed={aContext.restartContentStream}
                />
                <Button name="Clear" onPressed={aContext.clearContent} />
            </div>
        </div>
    )
}

function StatusBlock() {
    const aContext = useContext(AppContext)
    return (
        <div className="bg-header-bg text-header-text py-1 px-2 border border-header-border">
            <div className="stack-h gap-2 full-h">
                <div># Aborted</div>
                <div className="auto" />
                <Button
                    name="Retry"
                    onPressed={aContext.restartContentStream}
                />
                <Button name="Clear" onPressed={aContext.clearContent} />
            </div>
        </div>
    )
}

function HaltBlock({ next }) {
    const aContext = useContext(AppContext)
    return (
        <div className="bg-block-footer-bg text-block-footer-text py-1 px-2 border border-header-border">
            <div className="stack-h gap-2 full-h">
                <div># Haltet</div>
                <div className="auto" />
                <Button
                    name="Continue"
                    onPressed={() => aContext.haltContentStream("")}
                />
                {next && (
                    <Button
                        name="Stop at next"
                        onPressed={() => aContext.haltContentStream(next)}
                    />
                )}
                <Button name="Clear" onPressed={aContext.clearContent} />
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

function KeyValueBlock({ name, iterator }) {
    return (
        <div className="stack-v gap-1 border border-header-bg/50 p-1 grid-cols-[min-content_min-content]">
            <div className="px-2 py-1 bg-header-bg/50 text-app-bg text-xs">
                {name}
            </div>
            <div className="grid gap-1 grid-cols-[min-content_min-content]">
                {iterator.map(([idx, props]) => (
                    <Fragment key={idx}>
                        <div className="bg-header-bg/50 text-app-bg px-2 py-1 text-xs whitespace-nowrap">
                            {idx}
                        </div>
                        <div className="">{DumpValue(props)}</div>
                    </Fragment>
                ))}
            </div>
        </div>
    )
}

function DumpValue({ name, value }) {
    if (isArray(value)) {
        return KeyValueBlock({
            name,
            iterator: value.map((val, idx) => [idx, val])
        })
    }
    if (isObject(value)) {
        return KeyValueBlock({ name, iterator: Object.entries(value) })
    }
    return (
        <div className="stack-h gap-1">
            <div className="text-xs text-header-bg px-2 text-right">{name}</div>
            <pre className="dumparea px-2 text-xs text-block-header-text">
                {value}
            </pre>
        </div>
    )
}

function DumpBlock({ name, vars }) {
    return (
        <>
            <div className="stack-v gap-1 overflow-auto">
                <pre className="bg-header-bg/70 px-2 py-0 text-app-bg">
                    {name}
                </pre>

                <div className="stack-v overflow-auto grid-cols-[min-content_min-content] gap-y-1">
                    {vars.map((props, i) => (
                        <DumpValue key={i} {...props} />
                    ))}
                </div>
            </div>
        </>
    )
}

function CodeBlock(props) {
    const { name, html, hash, footer, isError, mime } = props
    const aContext = useContext(AppContext)
    const [colapsed, setColapsed] = useState(false)
    const toggle = () => {
        setColapsed(!colapsed)
    }
    const contentCls = new ClassNames("auto p-2")
    contentCls.addIf(colapsed, "colapsed")
    const footerElems = []
    if (footer) {
        for (const [name, value] of Object.entries(footer)) {
            footerElems.push(
                <div key={name} className="px-2">
                    <span className="text-block-footer-text/50">{name}:</span>{" "}
                    {value}
                </div>
            )
        }
    }
    const footerCls = new ClassNames(
        "stack-h divide-x-2 divide-block-footer-text/10 text-block-footer-text py-1 text-xs border border-t border-b-0 border-x-0 border-block-border/20"
    )
    footerCls.addIf(isError, "bg-warning-bg", "bg-block-footer-bg")

    let renderHtml = html
    const pipeline = PluginRegistry.getContentPipeline(mime)
    while (pipeline.length) {
        const exec = pipeline.shift()
        renderHtml = exec(renderHtml, aContext)
    }
    renderHtml = `<pre class="full colapsible">${renderHtml}</pre>`

    const buttons = [
        ...PluginRegistry.getBlockButtons({ ...props, ctx: aContext })
    ]

    return (
        <div className="border border-block-border text-block-header-text bg-block-header-bg">
            <div className="stack-h px-2 py-1">
                <div className="title auto text-left">{name}</div>
                {buttons.length > 0 && <ButtonGroup>{buttons}</ButtonGroup>}
            </div>

            <div className="stack-h bg-block-bg text-block-text">
                <div className="py-1 px-1 bg-block-header-bg/20">
                    <Button
                        icon={
                            colapsed
                                ? "keyboard_arrow_down"
                                : "keyboard_arrow_up"
                        }
                        className="not_px-2 py-1 px-1"
                        onPressed={toggle}
                    />
                </div>
                <div
                    className={contentCls.value}
                    dangerouslySetInnerHTML={{ __html: renderHtml }}
                />
            </div>

            {footer && <div className={footerCls.value}>{footerElems}</div>}
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

function WidgetBlock({ children }) {
    return <Div className="border p-1 border-app-text/50">{children}</Div>
}

function Widgets({ widgets }) {
    return (
        <Div className="mx-auto grid" width="50%">
            {widgets.map((widget, i) => (
                <WidgetBlock key={i}>{widget}</WidgetBlock>
            ))}
        </Div>
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
            <Centered>
                <div className="stack-v gap-2">
                    <div className="text-app-text text-sm">
                        Start a new request...
                    </div>
                    <Widgets widgets={PluginRegistry.widgets} />
                </div>
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
