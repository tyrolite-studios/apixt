import { useContext, useEffect } from "react"
import { AppCtx, AppContext } from "./context"
import { Header } from "./header"
import { Content } from "./content"
import { PluginRegistry } from "core/plugin"
import "plugins/history/plugin"
import "plugins/route-selector/plugin"
import "plugins/syntax-highlighter/plugin"
import "plugins/halt/plugin"
import "plugins/request-builder/plugin"
import "plugins/json-diff/plugin"
import "plugins/json5/plugin"
import { useRegisterAppListeners } from "./common.js"

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

function MainInner() {
    const onFocus = useRegisterAppListeners()
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
