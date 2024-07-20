import { useContext, useState } from "react"
import { AppContext } from "./context"
import { Icon } from "./layout"

function Button({ name, onClick, icon, className }) {
    const aContext = useContext(AppContext)
    const [clicked, setClicked] = useState(false)

    const state = clicked ? "active" : "button"

    const cls = [
        "text-xs border py-0 px-2 hover:brightness-110 focus:outline-none focus:ring focus:ring-focus-border"
    ]
    if (clicked) {
        cls.push("bg-active-bg text-active-text border-active-border")
    } else {
        cls.push("bg-button-bg text-button-text border-button-border")
    }

    if (className) cls.push(className)

    return (
        <button
            className={cls.join(" ")}
            onMouseDown={(e) => {
                aContext.startExclusiveMode("clicked", "pointer")
                aContext.addEventListener(
                    "mouseup",
                    (e) => {
                        aContext.endExclusiveMode("clicked")
                        setClicked(false)
                        onClick()
                    },
                    { once: true }
                )
                e.stopPropagation()
                e.preventDefault()
                setClicked(true)
            }}
        >
            <div className="stack-h gap-1">
                {name && <div>{name}</div>}
                {icon && <Icon name={icon} />}
            </div>
        </button>
    )
}

function ButtonGroup({ className, children }) {
    return <div className="stack-h gap-2">{children}</div>
}

// dummy input elems...

function Input({ name, className }) {
    const cls = [
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-2"
    ]
    if (className) cls.push(className)
    return <input name="" type="text" className={cls.join(" ")} />
}

function TextArea({ className, value }) {
    const cls = [
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border resize-none px-2"
    ]
    if (className) cls.push(className)
    return <textarea className={cls.join(" ")}>{value}</textarea>
}

function Select({ className, options }) {
    const cls = [
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-2"
    ]
    if (className) cls.push(className)

    const elems = []
    for (const [id, name] of Object.entries(options)) {
        elems.push(<option value={id}>{name}</option>)
    }
    return <select className={cls.join(" ")}>{elems}</select>
}

function Checkbox({ value, className }) {
    const cls = [
        "checked:bg-active-bg text-sm text-input-text bg-input-bg hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-1"
    ]
    if (className) cls.push(className)

    return (
        <input
            type="checkbox"
            value={value}
            checked={value}
            className={cls.join(" ")}
        />
    )
}

function Radio({}) {}

export { Button, ButtonGroup, Input, TextArea, Select, Radio, Checkbox }
