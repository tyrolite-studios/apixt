import { useModalWindow } from "./modal"
import { Button } from "./form"

function Section({ name, children, primary = false }) {
    const cls = ["px-3 border shadow-xl py-2"]
    cls.push(
        primary
            ? "border-primary-border bg-primary-bg text-primary"
            : "border-secondary-border bg-secondary-bg text-secondary"
    )

    const toggle = () => {}
    return (
        <div className={cls.join(" ")}>
            <div className="stack-h gap-2" onClick={toggle}>
                <div className="bg-primary text-primary-bg px-2 py-1">
                    <div>
                        <span>X</span>
                    </div>
                </div>
                <div className="auto text-left text-xs">{name}</div>
            </div>

            <div className="bg-app-bg text-app border border-primary-border p-2">
                {children}
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
    return (
        <>
            <div className="flex-auto text-sm p-10 text-center">
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
                    <Section name="Inner Circle">Bosduurer</Section>
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
