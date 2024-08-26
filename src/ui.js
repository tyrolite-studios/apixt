import "./index.css"
import { useState } from "react"
import { AppCtx } from "components/context"
import { createRoot } from "react-dom/client"
import controller from "core/controller"
import { Button, Input } from "./components/form"

function Section({ name, samples }) {
    const elems = []
    for (const { name, code, elem } of samples) {
        elems.push(
            <Sample key={name} name={name} code={code} children={elem} />
        )
    }

    return (
        <div className="stack-v p-2">
            <div className="bg-header-bg text-header-text px-2">{name}</div>
            <div className="p-2 grid grid-cols-2 gap-2">{elems}</div>
        </div>
    )
}

function Sample({ name, code, children }) {
    return (
        <>
            <div className="text-xs col-span-2 border-t pt-2 mt-1">{name}:</div>
            <div>{children}</div>
            <div>
                <pre className="border text-block-text/70 bg-block-bg border-block-border text-sm px-2">
                    {code}
                </pre>
            </div>
        </>
    )
}

function GetInput({ ...props }) {
    const [value, setValue] = useState("")
    return <Input value={value} set={setValue} {...props} />
}

function Content({}) {
    return (
        <div className="full bg-app-bg text-app-text">
            <Section
                name="Buttons"
                samples={[
                    {
                        name: "normal button (auto-width)",
                        code: '<Button name="Test button" />',
                        elem: <Button name="Test button" />
                    },
                    {
                        name: "normal button (full-width)",
                        code: '<Button name="Test button" className="w-full" />',
                        elem: <Button name="Test button" className="w-full" />
                    },
                    {
                        name: "icon + test button",
                        code: '<Button icon="person" name="Icon button" />',
                        elem: <Button icon="person" name="Icon button" />
                    },
                    {
                        name: "disabled button",
                        code: '<Button name="Test button" disabled />',
                        elem: <Button name="Test button" disabled />
                    }
                ]}
            />
            <Section
                name="Modals"
                samples={[
                    {
                        name: "Modal (auto-size)",
                        code: "<MyModal.Content>Hello!</MyModal.Content>",
                        elem: <Button name="Open" />
                    }
                ]}
            />
            <Section
                name="Inputs"
                samples={[
                    {
                        name: "Input (auto-width)",
                        code: '<Input name="Test input" />',
                        elem: <GetInput name="Test input" />
                    }
                ]}
            />
        </div>
    )
}

function MainLayout() {
    const config = {}
    return (
        <AppCtx config={config}>
            <Content />
        </AppCtx>
    )
}

function UiShowroomApp() {
    return (
        <>
            <MainLayout />
            <div id="modals" />
        </>
    )
}

controller.registerApp("ui", () => {
    document.body.innerHTML = '<div id="app"></div>'
    const root = createRoot(document.getElementById("app"))
    root.render(<UiShowroomApp />)
})

controller.startApp("ui")
