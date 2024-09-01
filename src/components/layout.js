import React, {
    createContext,
    useState,
    useContext,
    useRef,
    useEffect
} from "react"
import { ClassNames, d } from "core/helper"
import { ButtonGroup, Button } from "./form"
import { AppContext } from "./context"

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
        <ButtonGroup key="a" gapped={gapped} className={buttonGroupCls.value}>
            {tabElems.map(({ ...props }, i) => (
                <Button key={i} {...props} />
            ))}
        </ButtonGroup>
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

export { Div, Centered, Icon, Tabs, Tab }
