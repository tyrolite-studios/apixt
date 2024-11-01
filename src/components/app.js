import { useContext, useEffect } from "react"
import { AppCtx, AppContext } from "./context"
import { Header } from "./header"
import { Content } from "./content"
import { PluginRegistry } from "core/plugin"
import { d } from "core/helper"
import "plugins/history/plugin"
import "plugins/routeSelector/plugin"
import "plugins/syntaxHighlighter/plugin"
import "plugins/halt/plugin"
import "plugins/requestBuilder/plugin"
import "plugins/jsondiff/plugin"

function Footer() {
    const aContext = useContext(AppContext)
    return (
        <div className="text-xs text-right text-header-text/70 bg-header-bg py-1 px-2  border border-header-border/50 border-x-0 border-b-0">
            API Extender v{aContext.version} &copy; 2024 TyroLite Studios
        </div>
    )
}

function Plugins() {
    const aContext = useContext(AppContext)
    const elems = PluginRegistry.windows

    useEffect(() => {
        PluginRegistry.setContext(aContext)
    }, [])

    return <>{elems}</>
}

const HotKeySingleKeys = ["Escape", "Enter"]
const HotKeySkipValues = ["Meta", "Control", "Alt", "Shift"]

function MainInner() {
    const aContext = useContext(AppContext)

    const onFocus = (e) => {
        aContext.register("lastTarget", e.target)
        const zIndex = aContext.focusStack.zIndex
        if (!zIndex) {
            return
        }
        const focusElem = aContext.focusStack.elem[zIndex]
        if (!focusElem || !focusElem.top) {
            return
        }
        if (focusElem.top.contains(document.activeElement)) {
            return
        }
        if (focusElem.auto) {
            focusElem.auto.focus()
        } else {
            focusElem.start.focus()
        }
    }

    useEffect(() => {
        const hotkeyListener = (e) => {
            if (aContext.isInExclusiveMode()) {
                // TODO allow certain hotkeys?
                return
            }
            let hotKey = ""
            let actionKey = ""
            if (e.metaKey) {
                hotKey += "m"
            } else if (e.ctrlKey) {
                hotKey += "c"
            } else if (e.altKey) {
                hotKey += "a"
            } else if (HotKeySingleKeys.includes(e.key)) {
                actionKey = e.key
            } else if (
                e.key >= "0" &&
                e.key <= "9" &&
                !(
                    document.activeElement &&
                    ["INPUT", "TEXTAREA"].includes(
                        document.activeElement.tagName
                    )
                )
            ) {
                if (aContext.focusHotKeyArea(e.key)) {
                    e.stopPropagation()
                    e.preventDefault()
                    return
                }
            }
            if (hotKey.length > 0 && e.shiftKey) {
                hotKey += "i"
            }
            if (hotKey !== "") {
                actionKey = hotKey
                if (!HotKeySkipValues.includes(e.key)) {
                    actionKey += " " + e.key
                }
            }
            if (!actionKey) {
                return
            }
            const elem =
                document.activeElement === document.body
                    ? aContext.getLastTarget()
                    : document.activeElement
            const handler = aContext.getHandlerForActionKey(actionKey, elem)
            if (handler) {
                if (!e.repeat) {
                    if (typeof handler === "object") {
                        if (!handler.can || handler.can()) {
                            handler.exec()
                        }
                    } else {
                        handler()
                    }
                }
                e.stopPropagation()
                e.preventDefault()
            } else if (handler === null && actionKey === "Escape") {
                e.stopPropagation()
                e.preventDefault()
                // TODO: confirm()
            }
        }
        const clickListener = (e) => {
            aContext.register("lastTarget", e.target)
        }
        window.addEventListener("mousedown", clickListener, {})
        window.addEventListener("keydown", hotkeyListener, {})
        return () => {
            window.removeEventListener("mousedown", clickListener, {})
            window.removeEventListener("keydown", hotkeyListener, {})
        }
    })

    return (
        <div
            onFocus={onFocus}
            className="flex flex-col w-full h-full bg-app-bg text-app-text outline outline-app-border app-bounds"
        >
            <Header />
            <Content />
            <Footer />
            <Plugins />
        </div>
    )
}

function MainLayout({ config }) {
    return (
        <AppCtx config={config}>
            <MainInner />
        </AppCtx>
    )
}

function ApiExtenderApp({ config }) {
    console.log("Starting API extender with config", config)
    return (
        <>
            <MainLayout config={config} />
            <div id="modals" />
        </>
    )
}

export { ApiExtenderApp }
