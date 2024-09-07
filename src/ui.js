import "./index.css"
import { useState } from "react"
import { AppCtx } from "components/context"
import { createRoot } from "react-dom/client"
import controller from "core/controller"
import {
    Button,
    ButtonGroup,
    Input,
    Number,
    Checkbox,
    Textarea,
    Select,
    Radio,
    FormGrid,
    Picker,
    Color,
    Slider,
    CustomCells,
    SectionCells,
    CheckboxCells,
    InputCells,
    NumberCells,
    TextareaCells,
    SelectCells,
    RadioCells,
    ColorCells,
    SliderCells
} from "./components/form"
import { Icon, Tab, Tabs } from "./components/layout"
import { ClassNames } from "core/helper"
import { useModalWindow } from "./components/modal"
import { useExtractDimProps } from "./components/common"
import { d } from "./core/helper"

function Section({ name, samples }) {
    const elems = []
    for (const { name, code, elem, info } of samples) {
        if (info) {
            elems.push(
                <div key="info" className="pt-2  border-t col-span-2">
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
                <pre className="border break-all text-wrap text-block-text/70 bg-block-bg border-block-border text-sm px-2">
                    {code}
                </pre>
            </div>
        </>
    )
}

function GetTextarea({ value = "Test text", ...props }) {
    const [rawValue, setValue] = useState(value)
    return <Textarea value={rawValue} set={setValue} {...props} />
}

function GetInput({ value = "Test input", ...props }) {
    const [rawValue, setValue] = useState(value)

    return <Input value={rawValue} set={setValue} {...props} />
}

function GetNumber({ value = 666, ...props }) {
    const [rawValue, setValue] = useState(value)

    return <Number value={rawValue} set={setValue} {...props} />
}

function GetSelect({ value, ...props }) {
    const [rawValue, setValue] = useState(value === undefined ? 1 : value)
    const options = [
        { id: 1, name: "First option" },
        { id: 2, name: "Second option" },
        { id: 3, name: "Third option" }
    ]
    return (
        <Select {...props} options={options} set={setValue} value={rawValue} />
    )
}

function GetRadio({ value, ...props }) {
    const [rawValue, setValue] = useState(value === undefined ? 1 : value)
    const options = [
        { id: 1, name: "First option" },
        { id: 2, name: "Second option" },
        { id: 3, name: "Third option" }
    ]
    return (
        <Radio {...props} options={options} set={setValue} value={rawValue} />
    )
}

function GetCheckbox({ value = true, ...props }) {
    const [rawValue, setValue] = useState(value)
    return <Checkbox value={rawValue} set={setValue} {...props} />
}

function GetSlider({ value = 50, ...props }) {
    const [rawValue, setValue] = useState(value)
    return <Slider value={rawValue} set={setValue} {...props} />
}

function GetNumberSlider({ value = 50, vertical, ...props }) {
    const [rawValue, setValue] = useState(value)
    return (
        <>
            <Slider
                value={rawValue}
                vertical={vertical}
                set={setValue}
                {...props}
            />
            <Number value={rawValue} set={setValue} {...props} />
        </>
    )
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

function DashedRect({
    resize = false,
    resizeX = false,
    resizeY = false,
    children,
    ...props
}) {
    const style = useExtractDimProps(props)
    const cls = new ClassNames("border-4 border-dashed border-app-text/30")
    cls.addIf(resize, "resize")
    cls.addIf(resizeX, "resize-x")
    cls.addIf(resizeY, "resize-y")

    return (
        <div style={style} className={cls.value}>
            {children}
        </div>
    )
}

function Content({}) {
    const customWarning = {
        info: "The following attributes should only be used exceptionally..."
    }

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
                    name="Checkboxes"
                    samples={[
                        {
                            name: "normal checkbox",
                            code: "<Checkbox value={value} set={set} />",
                            elem: <GetCheckbox />
                        },
                        {
                            name: "readonly checkbox",
                            code: "<Checkbox readOnly value={value} set={set} />",
                            elem: <GetCheckbox readOnly />
                        },
                        {
                            name: "disabled checkbox",
                            code: "<Checkbox disabled value={value} set={set} />",
                            elem: <GetCheckbox disabled />
                        },
                        {
                            name: "invalid value checkbox",
                            code: "<Checkbox value={value} set={set} />",
                            elem: <GetCheckbox value={null} />
                        },
                        customWarning,
                        {
                            name: "unsized font checkbox",
                            code: "<Checkbox value={value} set={set} sized={false} />",
                            elem: <GetCheckbox sized={false} />
                        },
                        {
                            name: "custom-sized font checkbox",
                            code: '<Checkbox value={value} set={set} sized={false} className="..." />',
                            elem: (
                                <GetCheckbox
                                    sized={false}
                                    className="text-2xl"
                                />
                            )
                        },
                        {
                            name: "uncolored checkbox",
                            code: "<Checkbox value={value} set={set} colored={false} />",
                            elem: <GetCheckbox colored={false} />
                        },
                        {
                            name: "custom-colored checkbox",
                            code: '<Checkbox value={value} set={set} colored={false} className="..." />',
                            elem: (
                                <GetCheckbox
                                    colored={false}
                                    className="text-warning-text bg-warning-bg border-warning-text"
                                />
                            )
                        },
                        {
                            name: "unbordered checkbox",
                            code: "<Checkbox value={value} set={set} bordered={false} />",
                            elem: <GetCheckbox bordered={false} />
                        },
                        {
                            name: "custom-bordered checkbox",
                            code: '<Checkbox value={value} set={set} bordered={false} className="..." />',
                            elem: (
                                <GetCheckbox
                                    bordered={false}
                                    className="border-4 border-warning-text border-dashed"
                                />
                            )
                        },
                        {
                            name: "unstyled checkbox",
                            code: "<Checkbox value={value} set={set} styled={false} />",
                            elem: <GetCheckbox styled={false} />
                        },
                        {
                            name: "custom-styled checkbox",
                            code: '<Checkbox value={value} set={set} styled={false} className="..." />',
                            elem: (
                                <GetCheckbox
                                    styled={false}
                                    className="px-6 py-2 text-ok-text bg-ok-bg border-ok-text"
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Inputs"
                    samples={[
                        {
                            name: "default input",
                            code: "<Input value={...} set={...} />",
                            elem: <GetInput />
                        },
                        {
                            name: "default input & size",
                            code: "<Input value={...} set={...} size={5} />",
                            elem: <GetInput size={5} />
                        },
                        {
                            name: "default input & min + max length",
                            code: "<Input value={...} set={...} minLength={1} maxLength={3} />",
                            elem: (
                                <GetInput
                                    value="xy"
                                    minLength={1}
                                    maxLength={3}
                                />
                            )
                        },
                        {
                            name: "default input & custom width + height",
                            code: '<Input value={...} set={...} width="250px" height="50px" />',
                            elem: <GetInput width="250px" height="50px" />
                        },
                        {
                            name: "default input & min +  max width",
                            code: '<Input value={...} set={...} width="50%" minWidth="150px" maxWidth="300px" />',
                            elem: (
                                <GetInput
                                    width="50%"
                                    minWidth="150px"
                                    maxWidth="300px"
                                />
                            )
                        },
                        {
                            name: "full input",
                            code: "<Input value={...} set={...} full />",
                            elem: <GetInput full />
                        },
                        {
                            name: "required input",
                            code: "<Input value={...} set={...} required />",
                            elem: <GetInput required value="" />
                        },
                        {
                            name: "invalid value input",
                            code: "<Input value={false} set={...} />",
                            elem: <GetInput value={false} />
                        },
                        {
                            name: "custom validated input",
                            code: "<Input value={...} set={...} isValid={value => value === '42'} />",
                            elem: (
                                <GetInput
                                    value="test"
                                    isValid={(value) => value === "42"}
                                />
                            )
                        },
                        {
                            name: "readonly input",
                            code: "<Input value={...} set={...} readOnly />",
                            elem: <GetInput readOnly />
                        },
                        {
                            name: "disabled input",
                            code: "<Input value={...} set={...} disabled />",
                            elem: <GetInput disabled />
                        },
                        customWarning,
                        {
                            name: "unsized font input",
                            code: "<Input value={...} set={...} sized={false} />",
                            elem: <GetInput sized={false} />
                        },
                        {
                            name: "custom-sized font input",
                            code: '<Input value={...} set={...} sized={false} className="..." />',
                            elem: (
                                <GetInput sized={false} className="text-2xl" />
                            )
                        },
                        {
                            name: "unpadded input",
                            code: "<Input value={...} set={...} padded={false} />",
                            elem: <GetInput padded={false} />
                        },
                        {
                            name: "custom-padded input",
                            code: '<Input value={...} set={...} padded={false} className="..." />',
                            elem: <GetInput padded={false} className="p-4" />
                        },
                        {
                            name: "uncolored input",
                            code: "<Input value={...} set={...} colored={false} />",
                            elem: <GetInput colored={false} />
                        },
                        {
                            name: "custom-colored input",
                            code: '<Input value={...} set={...} colored={false} className="..." />',
                            elem: (
                                <GetInput
                                    colored={false}
                                    className="text-ok-text bg-ok-bg border-ok-text"
                                />
                            )
                        },
                        {
                            name: "unbordered input",
                            code: "<Input value={...} set={...} bordered={false} />",
                            elem: <GetInput bordered={false} />
                        },
                        {
                            name: "custom-bordered input",
                            code: '<Input value={...} set={...} bordered={false} className="..." />',
                            elem: (
                                <GetInput
                                    bordered={false}
                                    className="border-4 border-dotted"
                                />
                            )
                        },
                        {
                            name: "unstyled input",
                            code: "<Input value={...} set={...} styled={false} />",
                            elem: <GetInput styled={false} />
                        },
                        {
                            name: "custom-styled input",
                            code: '<Input value={...} set={...} styled={false} className="..." />',
                            elem: (
                                <GetInput
                                    styled={false}
                                    className="px-4 py-2 border-2 bg-warning-bg text-warning-text border-warning-text"
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Numbers"
                    samples={[
                        {
                            name: "default number",
                            code: "<Number value={...} set={...} />",
                            elem: <GetNumber />
                        },
                        {
                            name: "default number & min + max",
                            code: "<Number value={...} set={...} min={...} max={...} />",
                            elem: <GetNumber min={-10} max={100} value={50} />
                        },
                        {
                            name: "default number & custom size",
                            code: "<Number value={...} set={...} size={...} />",
                            elem: <GetNumber size={10} value={50} />
                        },
                        {
                            name: "default number & custom width + height",
                            code: '<Number value={...} set={...} width="250px" height="50px" />',
                            elem: <GetNumber width="250px" height="50px" />
                        },
                        {
                            name: "default number & min +  max width",
                            code: '<Number value={...} set={...} width="50%" minWidth="150px" maxWidth="300px" />',
                            elem: (
                                <GetNumber
                                    width="50%"
                                    minWidth="150px"
                                    maxWidth="300px"
                                />
                            )
                        },
                        {
                            name: "full number",
                            code: "<Number value={...} set={...} full />",
                            elem: <GetNumber full />
                        },
                        {
                            name: "readonly number",
                            code: "<Number value={...} set={...} readOnly />",
                            elem: <GetNumber readOnly />
                        },
                        {
                            name: "disabled number",
                            code: "<Number value={...} set={...} disabled />",
                            elem: <GetNumber disabled />
                        },
                        {
                            name: "invalid value number",
                            code: "<Number value={...} set={...} />",
                            elem: <GetNumber value={false} />
                        },

                        customWarning,
                        {
                            name: "unsized font number",
                            code: "<Number value={...} set={...} sized={false} />",
                            elem: <GetNumber sized={false} />
                        },
                        {
                            name: "custom-sized font number",
                            code: '<Number value={...} set={...} sized={false} className="..." />',
                            elem: (
                                <GetNumber sized={false} className="text-2xl" />
                            )
                        },
                        {
                            name: "unpadded number",
                            code: "<Number value={...} set={...} padded={false} />",
                            elem: <GetNumber padded={false} />
                        },
                        {
                            name: "custom-padded number",
                            code: '<Number value={...} set={...} padded={false} className="..." />',
                            elem: <GetNumber padded={false} className="p-4" />
                        },
                        {
                            name: "uncolored number",
                            code: "<Number value={...} set={...} colored={false} />",
                            elem: <GetNumber colored={false} />
                        },
                        {
                            name: "custom-colored number",
                            code: '<Number value={...} set={...} colored={false} className="..." />',
                            elem: (
                                <GetNumber
                                    colored={false}
                                    className="text-ok-text bg-ok-bg border-ok-text"
                                />
                            )
                        },
                        {
                            name: "unbordered number",
                            code: "<Number value={...} set={...} bordered={false} />",
                            elem: <GetNumber bordered={false} />
                        },
                        {
                            name: "custom-bordered number",
                            code: '<Number value={...} set={...} bordered={false} className="..." />',
                            elem: (
                                <GetNumber
                                    bordered={false}
                                    className="border-4 border-dotted"
                                />
                            )
                        },
                        {
                            name: "unstyled number",
                            code: "<Number value={...} set={...} styled={false} />",
                            elem: <GetNumber styled={false} />
                        },
                        {
                            name: "custom-styled number",
                            code: '<Number value={...} set={...} styled={false} className="..." />',
                            elem: (
                                <GetNumber
                                    styled={false}
                                    className="px-4 py-2 border-2 bg-warning-bg text-warning-text border-warning-text"
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Textareas"
                    samples={[
                        {
                            name: "defaul textarea",
                            code: "<Textarea value={...} set={...} />",
                            elem: <GetTextarea />
                        },
                        {
                            name: "readonly textarea",
                            code: "<Textarea value={...} readOnly />",
                            elem: <GetTextarea readOnly />
                        },
                        {
                            name: "disabled textarea",
                            code: "<Textarea value={...} set={...} disabled />",
                            elem: <GetTextarea disabled />
                        },
                        {
                            name: "full textarea",
                            code: "<Textarea value={...} set={...} full />",
                            elem: <GetTextarea full />
                        },
                        {
                            name: "cols + rows textarea",
                            code: "<Textarea value={...} set={...} cols={30} rows={5} />",
                            elem: <GetTextarea cols={30} rows={5} />
                        },
                        {
                            name: "default textarea & custom width + height",
                            code: '<Textarea value={...} set={...} width="350px" height="150px" />',
                            elem: <GetTextarea width="350px" height="150px" />
                        },
                        {
                            name: "default textarea & min + max width",
                            code: '<Textarea value={...} set={...} width="50%" minWidth="150px" maxWidth="300px" />',
                            elem: (
                                <GetTextarea
                                    width="50%"
                                    minWidth="150px"
                                    maxWidth="300px"
                                />
                            )
                        },
                        {
                            name: "min- und maxLength textarea",
                            code: "<Textarea value={...} set={...} minLength={2} maxLength={6} />",
                            elem: (
                                <GetTextarea
                                    minLength={2}
                                    maxLength={6}
                                    value="12345"
                                />
                            )
                        },
                        {
                            name: "required textarea",
                            code: "<Textarea value={...} set={...} required />",
                            elem: <GetTextarea required value="" />
                        },
                        {
                            name: "invalid value textarea",
                            code: "<Textarea value={...} set={...} />",
                            elem: <GetTextarea value={false} />
                        },
                        {
                            name: "custom-validated textarea",
                            code: '<Textarea value={...} set={...} isValid={value => value === "42"} />',
                            elem: (
                                <GetTextarea
                                    isValid={(value) => value === "42"}
                                />
                            )
                        },
                        customWarning,
                        {
                            name: "unsized font textarea",
                            code: "<Textarea value={...} set={...} sized={false} />",
                            elem: <GetTextarea sized={false} />
                        },
                        {
                            name: "custom-sized font textarea",
                            code: '<Textarea value={...} set={...} sized={false} className="..." />',
                            elem: (
                                <GetTextarea
                                    sized={false}
                                    className="text-2xl"
                                />
                            )
                        },
                        {
                            name: "unpadded textarea",
                            code: "<Textarea value={...} set={...} padded={false} />",
                            elem: <GetTextarea padded={false} />
                        },
                        {
                            name: "custom-padded textarea",
                            code: '<Textarea value={...} set={...} padded={false} className="..." />',
                            elem: <GetTextarea padded={false} className="p-4" />
                        },
                        {
                            name: "uncolored textarea",
                            code: "<Textarea value={...} set={...} colored={false} />",
                            elem: <GetTextarea colored={false} />
                        },
                        {
                            name: "custom-colored textarea",
                            code: '<Textarea value={...} set={...} colored={false} className="..." />',
                            elem: (
                                <GetTextarea
                                    colored={false}
                                    className="text-ok-text bg-ok-bg border-ok-text"
                                />
                            )
                        },
                        {
                            name: "unbordered textarea",
                            code: "<Textarea value={...} set={...} bordered={false} />",
                            elem: <GetTextarea bordered={false} />
                        },
                        {
                            name: "custom-bordered textarea",
                            code: '<Textarea value={...} set={...} bordered={false} className="..." />',
                            elem: (
                                <GetTextarea
                                    bordered={false}
                                    className="border-4 border-dotted"
                                />
                            )
                        },
                        {
                            name: "unstyled textarea",
                            code: "<Textarea value={...} set={...} styled={false} />",
                            elem: <GetTextarea styled={false} />
                        },
                        {
                            name: "custom-styled textarea",
                            code: '<Textarea value={...} set={...} styled={false} className="..." />',
                            elem: (
                                <GetTextarea
                                    styled={false}
                                    className="px-4 py-2 border-2 bg-warning-bg text-warning-text border-warning-text"
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Selects"
                    samples={[
                        {
                            name: "default select",
                            code: "<Select value={...} options={...} />",
                            elem: <GetSelect value="1" />
                        },
                        {
                            name: "default select & custom width",
                            code: '<Select value={...} options={...} width="300px" />',
                            elem: <GetSelect width="300px" />
                        },
                        {
                            name: "default select & min + maxWidth",
                            code: '<Select value={...} options={...} minWidth="100px" maxWidth="200px" width="30%" />',
                            elem: (
                                <GetSelect
                                    minWidth="100px"
                                    maxWidth="200px"
                                    width="30%"
                                />
                            )
                        },
                        {
                            name: "full select",
                            code: "<Select value={...} options={...} full />",
                            elem: <GetSelect full />
                        },
                        {
                            name: "readonly select",
                            code: "<Select value={...} options={...} readOnly />",
                            elem: <GetSelect readOnly value="2" />
                        },
                        {
                            name: "disabled select",
                            code: "<Select value={...} options={...} disabled />",
                            elem: <GetSelect disabled value={3} />
                        },
                        {
                            name: "empty select",
                            code: "<Select value={...} options={...} empty />",
                            elem: <GetSelect empty value="" />
                        },
                        {
                            name: "required select",
                            code: "<Select value={...} options={...} required />",
                            elem: <GetSelect required value="" />
                        },
                        {
                            name: "invalid option select",
                            code: "<Select value={...} options={...} />",
                            elem: <GetSelect value="xy" />
                        },
                        customWarning,
                        {
                            name: "unsized font select",
                            code: "<Select value={...} options={...} sized={false} />",
                            elem: <GetSelect sized={false} />
                        },
                        {
                            name: "custom-sized font select",
                            code: '<Select value={...} options={...} sized={false} className="..." />',
                            elem: (
                                <GetSelect sized={false} className="text-2xl" />
                            )
                        },
                        {
                            name: "unpadded select",
                            code: "<Select value={...} options={...} padded={false} />",
                            elem: <GetSelect padded={false} />
                        },
                        {
                            name: "custom-padded select",
                            code: '<Select value={...} options={...} padded={false} className="..." />',
                            elem: <GetSelect padded={false} className="p-4" />
                        },
                        {
                            name: "uncolored select",
                            code: "<Select value={...} options={...} colored={false} />",
                            elem: <GetSelect colored={false} />
                        },
                        {
                            name: "custom-colored select",
                            code: '<Select value={...} options={...} colored={false} className="..." />',
                            elem: (
                                <GetSelect
                                    colored={false}
                                    className="text-ok-text bg-ok-bg border-ok-text"
                                />
                            )
                        },
                        {
                            name: "unbordered select",
                            code: "<Select value={...} options={...} bordered={false} />",
                            elem: <GetSelect bordered={false} />
                        },
                        {
                            name: "custom-bordered select",
                            code: '<Select value={...} options={...} bordered={false} className="..." />',
                            elem: (
                                <GetSelect
                                    bordered={false}
                                    className="border-4 border-dotted"
                                />
                            )
                        },
                        {
                            name: "unstyled select",
                            code: "<Select value={...} options={...} styled={false} />",
                            elem: <GetSelect styled={false} />
                        },
                        {
                            name: "custom-styled select",
                            code: '<Select value={...} options={...} styled={false} className="..." />',
                            elem: (
                                <GetSelect
                                    styled={false}
                                    className="px-4 py-2 border-2 bg-warning-bg text-warning-text border-warning-text"
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Radios"
                    samples={[
                        {
                            name: "default radio",
                            code: "<Radio value={...} options={...} />",
                            elem: <GetRadio value={1} />
                        },
                        {
                            name: "default radio & fixed width + wrap)",
                            code: '<Radio value={...} options={...} width="250px" />',
                            elem: (
                                <DashedRect width="min-content" resizeX>
                                    <GetRadio width="250px" />
                                </DashedRect>
                            )
                        },
                        {
                            name: "defaulted radio & max-width + no wrap",
                            code: '<Radio value={...} options={...} maxWidth="250px" wrap={false} />',
                            elem: (
                                <DashedRect width="min-content">
                                    <GetRadio width="250px" wrap={false} />
                                </DashedRect>
                            )
                        },
                        {
                            name: "readonly radio",
                            code: "<Radio value={...} options={...} readOnly />",
                            elem: <GetRadio readOnly value={2} />
                        },
                        {
                            name: "disabled radio",
                            code: "<Radio value={...} options={...} disabled />",
                            elem: <GetRadio value={3} disabled />
                        },
                        {
                            name: "invalid value radio",
                            code: "<Radio value={...} options={...} />",
                            elem: <GetRadio value={5} />
                        },
                        customWarning,
                        {
                            name: "ungapped radio",
                            code: "<Radio value={...} options={...} gapped={false} />",
                            elem: <GetRadio gapped={false} value={1} />
                        },
                        {
                            name: "custom-gapped radio",
                            code: '<Radio value={...} options={...} gapped={false} className="..." />',
                            elem: (
                                <GetRadio
                                    gapped={false}
                                    className="gap-4"
                                    value={1}
                                />
                            )
                        },
                        {
                            name: "radio & custom button properties",
                            code: "<Radio value={...} options={...} buttonProps={...} />",
                            elem: (
                                <GetRadio
                                    value={1}
                                    buttonProps={{
                                        sized: false,
                                        padded: false,
                                        bordered: false,
                                        className: "text-xl px-4 py-2"
                                    }}
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Picker"
                    samples={[
                        {
                            name: "default string picker",
                            code: '<Picker options={["a", "b", ...]} pick={item => doSomething()} />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "default object picker",
                            code: '<Picker options={[{name: "a", ...}, ...]} pick={item => doSomething()}  />',
                            elem: (
                                <Picker
                                    maxHeight="100px"
                                    pick={(option) => d("PICKED", option)}
                                    options={[
                                        { name: "First object" },
                                        { name: "Second object" },
                                        { name: "Third object" }
                                    ]}
                                />
                            )
                        },
                        {
                            name: "default picker & custom rendererd options",
                            code: "<Picker options={...} pick={item => doSomething()} renderer={item => render(item)} />",
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    renderer={(option) => (
                                        <div className="stack-v">
                                            <div>{option.name}</div>
                                            <div className="opacity-50">
                                                {option.desc}
                                            </div>
                                        </div>
                                    )}
                                    options={[
                                        {
                                            name: "First option",
                                            desc: "More information here"
                                        },
                                        {
                                            name: "Second opion",
                                            desc: "Second option description"
                                        },
                                        { name: "Third option" }
                                    ]}
                                />
                            )
                        },
                        {
                            name: "default picker & max height",
                            code: '<Picker options={...} pick={item => doSomething()} maxHeight="..." />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    maxHeight="100px"
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String",
                                        "Fourth String",
                                        "Fifth String",
                                        "Sixth String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "default picker & min width + custom width",
                            code: '<Picker options={...} pick={item => doSomething()} minWidth="..." width="..." />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    minWidth="200px"
                                    width="50%"
                                    options={[
                                        "First very long string",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "default picker & max width + wrap",
                            code: '<Picker options={...} pick={item => doSomething()} maxWidth="..." />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    maxWidth="200px"
                                    options={[
                                        "First very long string",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "default picker & no wrap",
                            code: "<Picker options={...} pick={item => doSomething()} wrap={false} />",
                            elem: (
                                <DashedRect width="200px">
                                    <Picker
                                        pick={(option) => d("PICKED", option)}
                                        wrap={false}
                                        options={[
                                            "First very long string",
                                            "Second String",
                                            "Third String"
                                        ]}
                                    />
                                </DashedRect>
                            )
                        },
                        customWarning,
                        {
                            name: "unbordered picker",
                            code: "<Picker options={...} pick={item => doSomething() bordered={false}} />",
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    bordered={false}
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "custom-bordered picker",
                            code: '<Picker options={...} pick={item => doSomething() bordered={false} className="..."} />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    bordered={false}
                                    className="border-4 border-dotted border-warning-text"
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "undivided picker",
                            code: "<Picker options={...} pick={item => doSomething() divided={false}} />",
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    divided={false}
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "custom-divided picker",
                            code: '<Picker options={...} pick={item => doSomething() bordered={false} className="..."} />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    divided={false}
                                    className="divide-y-4 divide-input-border/25"
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "unsized font picker",
                            code: "<Picker options={...} pick={item => doSomething() sized={false}} />",
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    sized={false}
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "custom-sized picker",
                            code: '<Picker options={...} pick={item => doSomething() bordered={false} className="..."} />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    sized={false}
                                    className="text-2xl"
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "unpadded picker",
                            code: "<Picker options={...} pick={item => doSomething() padded={false}} />",
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    padded={false}
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "custom-padded picker",
                            code: '<Picker options={...} pick={item => doSomething() padded={false} itemClassName="..."} />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    padded={false}
                                    itemClassName="px-8 py-2"
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "uncolored picker",
                            code: "<Picker options={...} pick={item => doSomething() colored={false}} />",
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    colored={false}
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "custom-colored picker",
                            code: '<Picker options={...} pick={item => doSomething() colored={false} className="..."} />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    colored={false}
                                    className="text-warning-text bg-warning-bg border-warning-text divide-warning-text"
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "unstyled picker",
                            code: "<Picker options={...} pick={item => doSomething() styled={false}} />",
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    styled={false}
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        },
                        {
                            name: "custom-styled picker",
                            code: '<Picker options={...} pick={item => doSomething() styled={false} className="..." itemClassName="..."} />',
                            elem: (
                                <Picker
                                    pick={(option) => d("PICKED", option)}
                                    styled={false}
                                    itemClassName="px-8 py-2"
                                    className="text-ok-text bg-ok-bg border-ok-text divide-ok-text divide-y-4 border-dashed border-4"
                                    options={[
                                        "First String",
                                        "Second String",
                                        "Third String"
                                    ]}
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Colors"
                    samples={[
                        {
                            name: "default color",
                            code: "<Color value={...} set={...} />",
                            elem: <Color value="#FFFFD0" />
                        },
                        {
                            name: "readOnly color",
                            code: "<Color value={...} set={...} readOnly />",
                            elem: <Color value="#FFFFD0" readOnly />
                        },
                        {
                            name: "disabled color",
                            code: "<Color value={...} set={...} disabled />",
                            elem: <Color value="#FFFFD0" disabled />
                        },
                        {
                            name: "invalid value color",
                            code: "<Color value={...} set={...} disabled />",
                            elem: <Color value={true} />
                        },
                        customWarning,
                        {
                            name: "unpadded color",
                            code: "<Color value={...} set={...} padded={false} />",
                            elem: <Color value="#FFFFD0" padded={false} />
                        },
                        {
                            name: "custom-padded color",
                            code: '<Color value={...} set={...} padded={false} className="..." />',
                            elem: (
                                <Color
                                    value="#FFFFD0"
                                    padded={false}
                                    className="px-4 py-2"
                                />
                            )
                        },
                        {
                            name: "unbordered color",
                            code: "<Color value={...} set={...} bordered={false} />",
                            elem: <Color value="#FFFFD0" bordered={false} />
                        },
                        {
                            name: "custom-bordered color",
                            code: '<Color value={...} set={...} bordered={false} className="..." />',
                            elem: (
                                <Color
                                    value="#FFFFD0"
                                    bordered={false}
                                    className="border-4 border-dotted"
                                />
                            )
                        },
                        {
                            name: "uncolored color",
                            code: "<Color value={...} set={...} colored={false} />",
                            elem: <Color value="#FFFFD0" colored={false} />
                        },
                        {
                            name: "custom-colored color",
                            code: '<Color value={...} set={...} colored={false} className="..." innerClassName="..." />',
                            elem: (
                                <Color
                                    value="#FFFFD0"
                                    colored={false}
                                    className="bg-ok-bg border-ok-text"
                                    innerClassName="bg-ok-bg border-ok-text"
                                />
                            )
                        },
                        {
                            name: "unstyled color",
                            code: "<Color value={...} set={...} styled={false} />",
                            elem: <Color value="#FFFFD0" styled={false} />
                        },
                        {
                            name: "custom-styled color",
                            code: '<Color value={...} set={...} styled={false} className="..." innerClassName="..." />',
                            elem: (
                                <Color
                                    value="#FFFFD0"
                                    styled={false}
                                    className="bg-warning-bg border-warning-text border-2 p-4"
                                    innerClassName="bg-ok-bg border-ok-text"
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Sliders"
                    samples={[
                        {
                            name: "default slider",
                            code: "<Slider value={...} set={...} max={...} />",
                            elem: <GetSlider max={100} />
                        },
                        {
                            name: "default vertical slider",
                            code: "<Slider value={...} set={...} max={...} vertical />",
                            elem: <GetSlider max={100} vertical />
                        },
                        {
                            name: "default slider & min + max",
                            code: "<Slider value={...} set={...} min={...} max={...} />",
                            elem: <GetSlider min={0} max={100} />
                        },
                        {
                            name: "readonly slider",
                            code: "<Slider value={...}  max={...} readOnly />",
                            elem: <GetSlider max={100} readOnly />
                        },
                        {
                            name: "disabled slider",
                            code: "<Slider value={...} max={...} disabled />",
                            elem: <GetSlider max={100} disabled />
                        },
                        {
                            name: "invalid value slider",
                            code: "<Slider value={...} set={...} max={...} />",
                            elem: <GetSlider max={10} value={true} />
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
                                <DashedRect height="100px" width="min-content">
                                    <Button
                                        name="Text button"
                                        minHeight="50px"
                                        maxHeight="33%"
                                    />
                                </DashedRect>
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
                            name: "readonly button",
                            code: '<Button name="Test button" readOnly />',
                            elem: <Button name="Test button" readOnly />
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
                            name: "invalid button",
                            code: '<Button name="Test button" invalid />',
                            elem: <Button name="Test button" invalid />
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
                        customWarning,
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
                            name: "button group (auto-size)",
                            code: "<ButtonGroup buttons={[...]} />",
                            elem: (
                                <ButtonGroup
                                    buttons={[
                                        { name: "First" },
                                        { name: "Second" },
                                        { name: "Third" }
                                    ]}
                                />
                            )
                        },
                        {
                            name: "button group (fixed width & wrap)",
                            code: '<ButtonGroup buttons={[...]} width="150px" />',
                            elem: (
                                <DashedRect width="min-content" resizeX>
                                    <ButtonGroup
                                        width="150px"
                                        buttons={[
                                            { name: "First" },
                                            { name: "Second" },
                                            { name: "Third" }
                                        ]}
                                    />
                                </DashedRect>
                            )
                        },
                        {
                            name: "button group (max-width & no wrap)",
                            code: '<ButtonGroup buttons={[...]} maxWidth="150px" wrap={false} />',
                            elem: (
                                <DashedRect width="min-content" resizeX>
                                    <ButtonGroup
                                        maxWidth="150px"
                                        wrap={false}
                                        buttons={[
                                            { name: "First" },
                                            { name: "Second" },
                                            { name: "Third" }
                                        ]}
                                    />
                                </DashedRect>
                            )
                        },
                        {
                            name: "button group with disabled button",
                            code: "<ButtonGroup buttons={[...]} />",
                            elem: (
                                <ButtonGroup
                                    buttons={[
                                        { name: "First", disabled: true },
                                        { name: "Second" },
                                        { name: "Third" }
                                    ]}
                                />
                            )
                        },
                        customWarning,
                        {
                            name: "ungapped button group",
                            code: "<ButtonGroup buttons={[...]} gapped={false} />",
                            elem: (
                                <ButtonGroup
                                    gapped={false}
                                    buttons={[
                                        { name: "First" },
                                        { name: "Second" },
                                        { name: "Third" }
                                    ]}
                                />
                            )
                        },
                        {
                            name: "custom-gapped button group",
                            code: '<ButtonGroup buttons={[...]} gapped={false} className="..." />',
                            elem: (
                                <ButtonGroup
                                    gapped={false}
                                    className="gap-4"
                                    buttons={[
                                        { name: "First" },
                                        { name: "Second" },
                                        { name: "Third" }
                                    ]}
                                />
                            )
                        }
                    ]}
                />
                <Section
                    name="Tabs"
                    samples={[
                        {
                            name: "Tabs & active prop in tab",
                            code: '<Tabs>\n  <Tab name="..." active>...</Tab>\n</Tabs>',
                            elem: (
                                <DashedRect width="400px" height="200px">
                                    <Tabs>
                                        <Tab name="Test 1" active>
                                            Hello here is tab 1
                                        </Tab>
                                        <Tab name="Test 2">
                                            Hello here is tab 2
                                        </Tab>
                                        <Tab name="Last Tab">
                                            The last tab...
                                        </Tab>
                                    </Tabs>
                                </DashedRect>
                            )
                        },
                        {
                            name: "Tabs & active prop in tabs",
                            code: '<Tabs active="...">\n  <Tab name="...">...</Tab>\n</Tabs>',
                            elem: (
                                <DashedRect width="400px" height="200px">
                                    <Tabs className="border" active="Test 2">
                                        <Tab name="Test 1">
                                            Hello here is tab 1
                                        </Tab>
                                        <Tab name="Test 2">
                                            Hello here is tab 2
                                        </Tab>
                                    </Tabs>
                                </DashedRect>
                            )
                        }
                    ]}
                />
                <Section
                    name="Modals"
                    samples={[
                        {
                            name: "modal (auto-size)",
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
                    name="Form Grid & Cells"
                    samples={[
                        {
                            name: "default form grid",
                            code:
                                "<FormGrid>\n" +
                                '    <SectionCells name="..." />\n' +
                                '    <CheckboxCells name="..." ...props />\n' +
                                '    <InputCells name="..." ...props />\n' +
                                '    <SectionCells name="..." />\n' +
                                '    <NumberCells name="..." ...props />\n' +
                                '    <TextareaCells name="..." ...props />\n' +
                                '    <SelectCells name="..." ...props />\n' +
                                '    <RadioCells name="..." ...props />\n' +
                                '    <ColorCells name="..." ...props />\n' +
                                '    <SliderCells name="..." ...props />\n' +
                                '    <CustomCells name="...">...</CustomCells>\n' +
                                "</FormGrid>",
                            elem: (
                                <FormGrid>
                                    <SectionCells name="Section" />
                                    <CheckboxCells
                                        name="My checkbox"
                                        readOnly
                                        value={true}
                                    />
                                    <InputCells
                                        name="My input"
                                        readOnly
                                        value="Test input"
                                    />

                                    <SectionCells name="New section" />
                                    <NumberCells
                                        name="My number"
                                        readOnly
                                        value={42}
                                    />
                                    <TextareaCells
                                        name="My textarea"
                                        readOnly
                                        value="Test text"
                                    />
                                    <SelectCells
                                        name="My select"
                                        readOnly
                                        options={[
                                            { id: 1, name: "Test option" }
                                        ]}
                                        value={1}
                                    />
                                    <RadioCells
                                        name="My radio"
                                        readOnly
                                        options={[
                                            { id: 1, name: "Option 1" },
                                            { id: 2, name: "Option 2" },
                                            { id: 3, name: "Option 3" }
                                        ]}
                                        value={1}
                                    />
                                    <ColorCells
                                        name="My color"
                                        readOnly
                                        value="#000000"
                                    />
                                    <SliderCells
                                        name="My slider"
                                        readOnly
                                        value={33}
                                        max={100}
                                    />
                                    <CustomCells name="My custom cells">
                                        <div className="text-2xl p-4 text-warning-text bg-warning-bg border-warning-text border-2">
                                            Here is a custom cell
                                        </div>
                                    </CustomCells>
                                </FormGrid>
                            )
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
