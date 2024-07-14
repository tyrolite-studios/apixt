function Block({ full, children, flex, className, zIndex, padding, ...props }) {
    const cls = []
    const style = {}
    if (full || full === "w") {
        cls.push("w-full")
    }
    if (full || full === "h") {
        cls.push("h-full")
    }
    if (padding === true || padding === "w") {
        cls.push("px-2")
    }
    if (padding === true || padding === "h") {
        cls.push("py-2")
    }
    if (flex) {
        cls.push("flex-auto")
    }
    if (zIndex !== undefined) {
        style.zIndex = zIndex
    }
    if (className) cls.push(className)

    return (
        <div className={cls.join(" ")} style={style} {...props}>
            {children}
        </div>
    )
}

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
