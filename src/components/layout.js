import React, {
    createContext,
    useState,
    useContext,
    useRef,
    useEffect,
    useLayoutEffect,
    useMemo
} from "react"
import { ClassNames, d } from "core/helper"
import { ButtonGroup, Button } from "./form"
import { AppContext } from "./context"
import { useGetAttrWithDimProps, useGetTabIndex } from "./common"

const getLayoutProps = ({ zIndex, cursor, tab, ...props }) => {
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
    if (props.onDragStart) {
        attr.draggable = true
    }
    return {
        attr,
        style,
        remProps: props
    }
}

const Div = React.forwardRef(({ className, children, ...props }, ref) => {
    const cls = new ClassNames("", className)
    const { attr, style, remProps } = getLayoutProps(props)
    const divRef = useRef(null)
    if (ref) {
        attr["ref"] = ref
    } else {
        attr["ref"] = divRef
        ref = divRef
    }
    attr.tabIndex = useGetTabIndex(props, cls)
    return (
        <div className={cls.value} {...attr} style={style} {...remProps}>
            {children}
        </div>
    )
})

function Icon({ name, className, ...props }) {
    const cls = new ClassNames("material-icons leading-none", className)
    return (
        <span className={cls.value} {...props}>
            {name}
        </span>
    )
}

function Centered({ className, children }) {
    const cls = new ClassNames("place-content-center text-center", className)
    return (
        <div className="grid full">
            <div className={cls.value}>{children}</div>
        </div>
    )
}

const TabContext = createContext(null)

function Tabs({
    className,
    padded = true,
    gapped = true,
    persistId = "",
    children,
    ...props
}) {
    const aCtx = useContext(AppContext)
    const [ready, setReady] = useState(false)
    const activeRef = useRef(null)

    let [active, setActiveRaw] = useState(
        props.active !== undefined ? props.active : null
    )

    if (props.setActive) {
        active = props.active
        setActiveRaw = props.setActive
    }
    activeRef.current = active

    useEffect(() => {
        return () => {
            if (!persistId) return

            aCtx.globalStorage.setJson("tab." + persistId, activeRef.current)
        }
    }, [])
    useEffect(() => {
        if (!ready || !persistId) return

        const persisted = aCtx.globalStorage.getJson("tab." + persistId)
        if (persisted) {
            setActiveRaw(persisted)
        }
    }, [ready])

    const items = useRef([])
    const setActive = (value) => {
        setActiveRaw(value)
    }
    const ctx = {
        active,
        setActive,
        add: (name) => {
            if (!items.current.includes(name)) {
                items.current.push(name)
                requestAnimationFrame(() => setReady(true))
            }
        },
        ready
    }
    const cls = new ClassNames("stack-v gap-2 full", className)
    const tabElems = []

    const currIndex = items.current.indexOf(active)
    let i = 0
    for (let item of items.current) {
        const curr = i
        tabElems.push({
            name: item,
            bordered: true,
            value: currIndex,
            activated: curr,
            onPressed: () => {
                setActive(items.current[curr])
            }
        })
        i++
    }
    const buttonGroupCls = new ClassNames("bg-header-bg/50")
    buttonGroupCls.addIf(padded, "px-2 pt-2")

    const stackItems = []
    stackItems.push(
        <ButtonGroup
            key="a"
            active={currIndex === -1 ? 0 : currIndex}
            buttons={tabElems}
            gapped={gapped}
            className={buttonGroupCls.value}
        />
    )
    stackItems.push(
        <div className="auto" key="b">
            <TabContext.Provider value={ctx}>{children}</TabContext.Provider>
        </div>
    )
    return <div className={cls.value}>{stackItems}</div>
}

function Tab({ name, active, children }) {
    const tabContext = useContext(TabContext)

    useEffect(() => {
        tabContext.add(name)
        if (active || tabContext.active === name) {
            tabContext.setActive(name)
        }
    }, [])

    if (!tabContext.ready || tabContext.active !== name) {
        return null
    }
    return children
}

function Stack({ vertical, className, gapped = true, children, ...props }) {
    const cls = new ClassNames("stack-" + (vertical ? "v" : "h"), className)
    cls.addIf(gapped, "gap-2")
    const attr = useGetAttrWithDimProps(props)
    return (
        <Div className={cls.value} {...attr}>
            {children}
        </Div>
    )
}

const OverlayContext = createContext()

function Overlays({
    width,
    maxWidth,
    full,
    height,
    cursor,
    originX = 0,
    originY = 0,
    scroll,
    className,
    children
}) {
    const cls = new ClassNames("relative", className)
    const style = {
        width: width + originX,
        maxWidth,
        height: height + originY
    }
    if (cursor) {
        style.cursor = cursor
    }
    cls.addIf(scroll, "scroll max-v max-h")
    const originCls = new ClassNames()
    if (full) {
        if (full !== "h") {
            cls.addIf(!style.height, "h-full")
            originCls.add("h-full")
        }
        if (full !== "v") {
            cls.addIf(!style.width, "w-full")
            originCls.add("w-full")
        }
    }
    const overlay = {
        width,
        height,
        originX,
        originY
    }
    if (originX !== 0 || originY !== 0) {
        originCls.add("relative")
        overlay.width -= originX
        overlay.height -= originY
        const originStyle = { marginLeft: originX, marginTop: originY }
        children = (
            <div className={originCls.value} style={originStyle}>
                {children}
            </div>
        )
    }
    return (
        <OverlayContext.Provider value={overlay}>
            <div style={style} className={cls.value}>
                {children}
            </div>
        </OverlayContext.Provider>
    )
}

const Overlay = React.forwardRef(
    (
        { width, height, top = 0, left = 0, className, children, ...props },
        forwardRef
    ) => {
        const cls = new ClassNames("absolute", className)
        const style = {
            width,
            height,
            top,
            left
        }
        return (
            <div
                ref={forwardRef}
                style={style}
                className={cls.value}
                {...props}
            >
                {children}
            </div>
        )
    }
)

const AvailContext = createContext()

function AvailContextProvider({ children }) {
    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)
    const propsRef = useRef(null)
    const observerRef = useRef(null)
    const divRef = useRef(null)

    propsRef.current = { width, height }

    useLayoutEffect(() => {
        const checkSize = () => {
            if (!divRef.current) return

            const rect = divRef.current.getBoundingClientRect()
            if (rect.width !== propsRef.current.width) {
                setWidth(rect.width)
            }
            if (rect.height !== propsRef.current.height) {
                setHeight(rect.height)
            }
        }
        const observer = new ResizeObserver(checkSize)
        observerRef.current = observer
        observer.observe(divRef.current)
        checkSize()
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [])

    const value = useMemo(() => {
        return {
            width,
            height
        }
    }, [width, height])

    const cls = new ClassNames("bounds overlays")
    const style = {}
    if (width === 0) {
        cls.add("w-full")
    } else {
        style.width = width
    }
    if (height === 0) {
        cls.add("h-full")
    } else {
        style.height = height
    }
    return (
        <div ref={divRef} className="full overlays">
            <AvailContext.Provider value={value}>
                <div className={cls.value} style={style}>
                    {children}
                </div>
            </AvailContext.Provider>
        </div>
    )
}

export {
    Div,
    Centered,
    Icon,
    Tabs,
    Tab,
    Stack,
    Overlays,
    Overlay,
    useGetTabIndex,
    AvailContextProvider,
    AvailContext
}
