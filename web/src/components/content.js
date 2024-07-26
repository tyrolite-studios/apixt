import { useModalWindow } from "./modal"
import { Button } from "./form"
import { useState } from "react"
import { getStringifiedJSON } from "../util"
import { ClassNames } from "../core/helper"
import { d } from "../core/helper"

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

        default:
            throw Error(`Unknown node type "${type}" given!`)
    }
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

function LoadingSpinner() {
    return (
        <div className="grid full">
            <div className="place-self-center">Loading...</div>
        </div>
    )
}

const cTree = {
    type: "root",
    nodes: [
        { type: "dump-block", name: "Dump @ Line 33 in woewoeowe" },
        {
            type: "section",
            name: "Tree results",
            nodes: [
                {
                    type: "section-group",
                    nodes: [
                        {
                            type: "section",
                            name: "Deeper",
                            nodes: [
                                {
                                    type: "section",
                                    name: "More Deep",
                                    nodes: [
                                        {
                                            type: "code-block",
                                            name: "Http Request",
                                            html: `<pre class="full colapsible">${getStringifiedJSON({ foo: "bar", "fooo-3": { number: 666 } }, 4)}</pre>`
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

function Content() {
    const LoadingWindow = useModalWindow()

    const html = `<pre class="full colapsible">${getStringifiedJSON({ foo: "bar", "fooo-3": { number: 666 } }, 4)}</pre>`

    return (
        <>
            <div className="auto text-sm p-2 overflow-auto">
                <ContentTree root={cTree} />

                <div className="stack-v gap-3">
                    <DumpBlock name="Vardump @/home/user/var/www/test-api/src/TestApi/Domain/Music/Provider/ReleaseKpisProvider.php:238:" />

                    <Section name="Outer Frame" primary>
                        <SectionGroup>
                            <Section name="Inner Frame">
                                <CodeBlock name="HTTP Request" html={html} />
                            </Section>
                        </SectionGroup>
                        <DumpBlock name="Vardump @/home/user/var/www/test-api/src/TestApi/Domain/Music/Provider/ReleaseKpisProvider.php:238:" />
                    </Section>
                    <CodeBlock name="HTTP Request" html={html} />
                </div>
            </div>

            <LoadingWindow.content
                name="Loading..."
                drag
                transparent
                width="250px"
                height="120px"
            >
                <LoadingSpinner {...LoadingWindow.props} />
            </LoadingWindow.content>
        </>
    )
}

export { Section, Content }
