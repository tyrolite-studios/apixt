import React from "react"

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

const Block = React.forwardRef(({ children, ...props }, ref) => {
    const { cls, attr, style, remProps } = getLayoutProps(props)

    return (
        <div className={cls.join(" ")} {...attr} style={style} {...remProps}>
            {children}
        </div>
    )
})

function Stack({ children, vertical, full, gaps, padding, className }) {
    const parentCls = ["flex"]
    if (className) parentCls.push(className)
    parentCls.push(!vertical ? "flex-row" : "flex-col")
    if (full || full === "w") {
        parentCls.push("w-full")
    }
    if (full || full === "h") {
        parentCls.push("h-full")
    }
    if (padding === true || padding === "w") {
        parentCls.push("px-2")
    }
    if (padding === true || padding === "h") {
        parentCls.push("py-2")
    }
    if (gaps) {
        parentCls.push("gap-2")
    }
    const parentAttr = {}
    const parentStyle = {}
    return (
        <div
            {...parentAttr}
            className={parentCls.join(" ")}
            style={parentStyle}
        >
            {children}
        </div>
    )
}

export { Block, Stack }
