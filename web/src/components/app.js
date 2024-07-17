import { useContext } from "react"
import { AppCtx, AppContext } from "./context"
import { Header } from "./header"
import { Content } from "./content"

function LoadingSpinner() {
    return (
        <div className="grid full">
            <div className="place-self-center">Loading...</div>
        </div>
    )
}

function Footer() {
    const aContext = useContext(AppContext)
    return (
        <div className="text-xs text-right text-header bg-header-bg py-1 px-2">
            API Extender v{aContext.version} &copy; 2024 TyroLite Studios
        </div>
    )
}

function MainLayout(props) {
    return (
        <AppCtx>
            <div className="flex flex-col w-full h-full bg-app-bg text-app">
                <Header />
                <Content />
                <Footer />
            </div>
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
