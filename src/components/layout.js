import React from "react"
import { ClassNames } from "core/helper"
import { useExtractDimProps } from "./common"

const getLayoutProps = ({ className, zIndex, cursor, tab, ...props }) => {
    const cls = []
    if (className) {
        cls.push(className)
    }
    const attr = {}
    const style = {}
    for (let prop of [
        "width",
        "minWidth",
        "maxWidth",
        "height",
        "minHeight",
        "maxHeight"
    ]) {
        let value = props[prop]
        if (!value) continue

        if (typeof value === "string" && value.match(/^\d+$/)) {
            value = parseInt(value, 10)
        }
        style[prop] = value
    }
    if (zIndex !== undefined) {
        style.zIndex = zIndex
    }
    if (cursor) {
        style.cursor = cursor
    }
    if (tab) {
        attr.tabIndex = 0
        cls.push("tabbed")
    } else if (tab === false) {
        attr.tabIndex = -1
    }
    if (props.onDragStart) {
        attr.draggable = true
    }
    return {
        cls,
        attr,
        style,
        remProps: props
    }
}

const Div = React.forwardRef(({ children, ...props }, ref) => {
    const { cls, attr, style, remProps } = getLayoutProps(props)

    return (
        <div className={cls.join(" ")} {...attr} style={style} {...remProps}>
            {children}
        </div>
    )
})

function Icon({ name, className }) {
    const cls = new ClassNames("material-icons leading-none", className)
    return <span className={cls.value}>{name}</span>
}

function Centered({ className, children }) {
    const cls = new ClassNames("place-content-center text-center", className)
    return (
        <div className="grid full">
            <div className={cls.value}>{children}</div>
        </div>
    )
}

export { Div, Centered, Icon }
