import { useModalWindow } from "./modal"
import { Button } from "./form"
import { useState } from "react"

function Section({ name, children, primary = false }) {
    const [colapsed, setColapsed] = useState(false)

    const cls = ["px-2 border shadow-xl pt-1 pb-2"]
    cls.push(
        primary
            ? " border-frame-odd-border bg-frame-odd-bg text-frame-odd-text"
            : " border-frame-even-border bg-frame-even-bg text-frame-even-text"
    )

    const toggle = () => {
        setColapsed(!colapsed)
    }

    const contentCls = [
        "stack-v bg-app-bg text-app-text border border-frame-odd-border p-2 gap-2"
    ]
    if (colapsed) {
        contentCls.push("colapsed")
    }
    return (
        <div className={cls.join(" ")}>
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

            <div className={contentCls.join(" ")}>{children}</div>
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
    const contentCls = ["auto p-2"]
    if (colapsed) {
        contentCls.push("colapsed")
    }
    return (
        <div className="border border-block-border text-block-header-text bg-block-header-bg">
            <div className="stack-h px-2 py-1">
                <div className="title auto text-left">{name}</div>
                <div className="stack-h">
                    <Button name=" ◼ STOP HERE" onclick={() => reload(hash)} />
                </div>
            </div>

            <div className="stack-h bg-block-bg text-block-text">
                <div className="py-2 px-1 bg-block-header-bg/20">
                    <Button
                        icon={
                            colapsed
                                ? "keyboard_arrow_down"
                                : "keyboard_arrow_up"
                        }
                        className="py-1 px-1"
                        onClick={toggle}
                    />
                </div>
                <div
                    className={contentCls.join(" ")}
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

function Content() {
    const LoadingWindow = useModalWindow()

    const html = `<pre class="full colapsible">${JSON.stringify({ foo: "bar", "fooo-2": { number: 666 } }, null, 4)}</pre>`

    return (
        <>
            <div className="auto text-sm p-2 overflow-auto">
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
