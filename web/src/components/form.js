import { useContext, useState } from "react"
import { AppContext } from "./context"
import { Icon } from "./layout"
import { ClassNames } from "../core/helper"

function Button({ name, onClick, icon, className }) {
    const aContext = useContext(AppContext)
    const [clicked, setClicked] = useState(false)

    const cls = new ClassNames(
        "text-xs border py-0 px-2 hover:brightness-110 focus:outline-none focus:ring focus:ring-focus-border",
        className
    )
    cls.addIf(
        clicked,
        "bg-active-bg text-active-text border-active-border",
        "bg-button-bg text-button-text border-button-border"
    )
    return (
        <button
            className={cls.value}
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
    const cls = new ClassNames("stack-h gap-2", className)
    return <div className={cls.value}>{children}</div>
}

// dummy input elems...

function Input({ name, className }) {
    const cls = new ClassNames(
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-2",
        className
    )
    return <input name="" type="text" className={cls.value} />
}

function TextArea({ className, value }) {
    const cls = new ClassNames(
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border resize-none px-2",
        className
    )
    return <textarea className={cls.value}>{value}</textarea>
}

function Select({ className, options }) {
    const cls = new ClassNames(
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-2",
        className
    )
    const elems = []
    for (const [id, name] of Object.entries(options)) {
        elems.push(
            <option key={id} value={id}>
                {name}
            </option>
        )
    }
    return <select className={cls.value}>{elems}</select>
}

function Checkbox({ value, className }) {
    const cls = new ClassNames(
        "checked:bg-active-bg text-sm text-input-text bg-input-bg hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-1",
        className
    )
    return (
        <input
            type="checkbox"
            value={value}
            checked={value}
            className={cls.value}
        />
    )
}

function Radio({}) {}

export { Button, ButtonGroup, Input, TextArea, Select, Radio, Checkbox }
