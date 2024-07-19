import { useModalWindow } from "./modal"
import { Button } from "./form"

function Section({ name, children, primary = false }) {
    const cls = ["px-2 border shadow-xl pt-1 pb-2"]
    cls.push(
        primary
            ? " border-primary-border bg-primary-bg text-primary"
            : " border-secondary-border bg-secondary-bg text-secondary"
    )

    const toggle = () => {}
    return (
        <div className={cls.join(" ")}>
            <div className="stack-h gap-2" onClick={toggle}>
                <div className="border-primary-border bg-primary text-primary-bg px-2 py-0">
                    <div>
                        <span>X</span>
                    </div>
                </div>
                <div className="auto full text-left">
                    <div className="inline-block align-top text-xs">{name}</div>
                </div>
            </div>

            <div className="bg-app-bg text-app border border-primary-border p-2">
                {children}
            </div>
        </div>
    )
}

function CodeBlock({ name, html, hash }) {
    const reload = (target) => console.log("reload", target)
    return (
        <div className="border border-block-header-border text-block-header bg-block-header-bg">
            <div className="stack-h px-2 py-1">
                <div className="title auto text-left">{name}</div>
                <div className="stack-h">
                    <Button name=" ◼ STOP HERE" onclick={() => reload(hash)} />
                </div>
            </div>

            <div className="stack-h bg-block-bg text-block">
                <div
                    className="p-2 bg-block-side-bg"
                    onclick="toggleCodeBlock(this)"
                >
                    <Button name="+" className="py-1 text-xl" />
                </div>
                <div
                    className="auto p-2"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>

            <div className="text-block-footer bg-block-footer-bg px-2 py-1 text-xs border border-t border-b-0 border-x-0 border-block-footer-border">
                <span class="opacity-50">Content-Type:</span> text/json
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

    const html = `<pre class="full">${JSON.stringify({ foo: "bar", "fooo-2": { number: 666 } }, null, 4)}</pre>`

    return (
        <>
            <div className="auto text-sm p-2 overflow-auto">
                Content will load heres...
                <br />
                <br />
                <Button
                    className="w-full text-center"
                    name="Load"
                    onClick={LoadingWindow.open}
                />
                <br />
                <br />
                <br />
                <Section name="Hier geht es ab" primary>
                    <Section name="Inner Circle">
                        <CodeBlock name="HTTP Request" html={html} />
                    </Section>
                </Section>
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
