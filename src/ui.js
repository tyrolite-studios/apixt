import "./index.css"
import { useState } from "react"
import { AppCtx } from "components/context"
import { createRoot } from "react-dom/client"
import controller from "core/controller"
import { Button, ButtonGroup, Input } from "./components/form"
import { Icon } from "./components/layout"
import { useModalWindow } from "./components/modal"

function Section({ name, samples }) {
    const elems = []
    for (const { name, code, elem, info } of samples) {
        if (info) {
            elems.push(
                <div key="info" className="pt-2  border-t  col-span-2">
                    <div className="text-sm bg-warning-bg text-warning-text p-2">
                        {info}
                    </div>
                </div>
            )
        } else {
            elems.push(
                <Sample key={name} name={name} code={code} children={elem} />
            )
        }
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

function GetModal({ children, ...props }) {
    const ModalWindow = useModalWindow()

    return (
        <>
            <Button name="open" onPressed={() => ModalWindow.open()} />
            <ModalWindow.content {...props}>{children}</ModalWindow.content>
        </>
    )
}

function Content({}) {
    return (
        <div className="full bg-app-bg text-app-text">
            <div className="overflow-auto max-h-full">
                <Section
                    name="Icons"
                    samples={[
                        {
                            name: "normal icon",
                            code: '<Icon name="build" />',
                            elem: <Icon name="build" />
                        },
                        {
                            name: "custom styled icon",
                            code: '<Icon name="build" className="..." />',
                            elem: (
                                <Icon
                                    name="build"
                                    className="text-warning-text bg-warning-bg text-xl p-2 border border-app-text"
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Buttons"
                    samples={[
                        {
                            name: "text button (auto-width)",
                            code: '<Button name="Text button" />',
                            elem: <Button name="Text button" />
                        },
                        {
                            name: "text button (full-width)",
                            code: '<Button name="Test button" full />',
                            elem: <Button name="Test button" full />
                        },
                        {
                            name: "fixed width & text overflow",
                            code: '<Button name="Text button-with-overflowing text" width="150px" />',
                            elem: (
                                <Button
                                    name="Text button-with-overflowing text"
                                    width="150px"
                                />
                            )
                        },
                        {
                            name: "min-width & max-width button",
                            code: '<Button name="Text button" minWidth="25%" maxWidth="150px" />',
                            elem: (
                                <Button
                                    name="Text button"
                                    minWidth="25%"
                                    maxWidth="150px"
                                />
                            )
                        },
                        {
                            name: "fixed height",
                            code: '<Button name="Text button" height="50px" />',
                            elem: <Button name="Text button" height="50px" />
                        },
                        {
                            name: "min-height & max-height button",
                            code: '<Button name="Text button" minHeight="50px" maxHeight="33%" />',
                            elem: (
                                <div
                                    style={{
                                        height: "100px",
                                        width: "min-content",
                                        border: "1px dotted white"
                                    }}
                                >
                                    <Button
                                        name="Text button"
                                        minHeight="50px"
                                        maxHeight="33%"
                                    />
                                </div>
                            )
                        },
                        {
                            name: "icon (start) + text button",
                            code: '<Button icon="person" name="Icon button" />',
                            elem: <Button icon="person" name="Icon button" />
                        },
                        {
                            name: "icon (end) + text button",
                            code: '<Button icon="person" name="Icon button" reverse />',
                            elem: (
                                <Button
                                    icon="person"
                                    name="Icon button"
                                    reverse
                                />
                            )
                        },
                        {
                            name: "icon button",
                            code: '<Button icon="delete" />',
                            elem: <Button icon="delete" />
                        },
                        {
                            name: "disabled button",
                            code: '<Button name="Test button" disabled />',
                            elem: <Button name="Test button" disabled />
                        },
                        {
                            name: "activated button",
                            code: '<Button name="Test button" value="one" activated="one" />',
                            elem: (
                                <Button
                                    name="Test button"
                                    value="one"
                                    activated="one"
                                />
                            )
                        },
                        {
                            name: "inactivated button",
                            code: '<Button name="Test button" value="two" activated="one" />',
                            elem: (
                                <Button
                                    name="Test button"
                                    value="two"
                                    activated="one"
                                />
                            )
                        },
                        {
                            name: "onPressed & onPressedEnd button handler",
                            code: '<Button name="Test button" onPressed="..." onPressedEnd="..." />',
                            elem: (
                                <Button
                                    name="Test button"
                                    onPressed={() => console.log("PRESSING...")}
                                    onPressedEnd={(outside) =>
                                        console.log(
                                            "...END",
                                            "outside?",
                                            outside
                                        )
                                    }
                                />
                            )
                        },
                        {
                            info: "The following attributes should only be used exceptionally..."
                        },
                        {
                            name: "unsized font button",
                            code: '<Button name="Text button" sized={false} />',
                            elem: <Button name="Text button" sized={false} />
                        },
                        {
                            name: "custom-sized font button",
                            code: '<Button name="Text button" sized={false} className="..." />',
                            elem: (
                                <Button
                                    name="Text button"
                                    sized={false}
                                    className="text-2xl italic"
                                />
                            )
                        },
                        {
                            name: "uncolored button",
                            code: '<Button name="Text button" colored={false} />',
                            elem: <Button name="Text button" colored={false} />
                        },
                        {
                            name: "custom-colored button",
                            code: '<Button name="Text button" colored={false} className="..." />',
                            elem: (
                                <Button
                                    name="Text button"
                                    colored={false}
                                    className="bg-ok-bg text-ok-text border-ok-text"
                                />
                            )
                        },
                        {
                            name: "unbordered button",
                            code: '<Button name="Text button" bordered={false} />',
                            elem: <Button name="Text button" bordered={false} />
                        },
                        {
                            name: "custom-bordered button",
                            code: '<Button name="Text button" bordered={false} className="..." />',
                            elem: (
                                <Button
                                    name="Text button"
                                    bordered={false}
                                    className="border-4 border border-spacing-2 border-dashed border-warning-text"
                                />
                            )
                        },
                        {
                            name: "unpadded button",
                            code: '<Button name="Text button" padded={false} />',
                            elem: <Button name="Text button" padded={false} />
                        },
                        {
                            name: "custom-padded button",
                            code: '<Button name="Text button" padded={false} className="..." />',
                            elem: (
                                <Button
                                    name="Text button"
                                    padded={false}
                                    className="py-4 px-6"
                                />
                            )
                        },
                        {
                            name: "custom icon style",
                            code: '<Button icon="build" name="Icon button" iconClassName="..." />',
                            elem: (
                                <Button
                                    icon="build"
                                    name="Icon button"
                                    iconClassName="text-warning-text"
                                />
                            )
                        },
                        {
                            name: "unstyled button",
                            code: '<Button name="Text button" styled={false} />',
                            elem: <Button name="Text button" styled={false} />
                        },
                        {
                            name: "custom-styled button",
                            code: '<Button name="Text button" styled={false} className="..." />',
                            elem: (
                                <Button
                                    name="Text button"
                                    styled={false}
                                    className="text-lg text-warning-text bg-warning-bg p-4 border-warning-text border-4"
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="ButtonGroups"
                    samples={[
                        {
                            name: "Button group",
                            code: "<ButtonGroup>...</ButtonGroup>",
                            elem: (
                                <ButtonGroup>
                                    <Button name="First" />
                                    <Button name="Second" />
                                    <Button name="Third" />
                                </ButtonGroup>
                            )
                        }
                    ]}
                />
                <Section
                    name="Modals"
                    samples={[
                        {
                            name: "Modal (auto-size)",
                            code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                            elem: (
                                <GetModal name="Test Modal">
                                    Hello here is long text!
                                </GetModal>
                            )
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
