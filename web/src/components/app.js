import { AppCtx } from "./context"
import { Button } from "./form"
import { Header } from "./header"

function Content() {
    return (
        <div className="flex-auto text-sm p-10 text-center">
            Loading...
            <Button className="w-full text-center" name="Click me" />
        </div>
    )
}

function Footer() {
    return (
        <div className="text-xs text-right text-header bg-header-bg py-1 px-2">
            API Extender v0.0.1 &copy; 2024 TyroLite Studios
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
