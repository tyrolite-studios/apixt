import "./index.css"
import { TempStorage } from "core/storage"
import controller from "core/controller"
window.controller.setStorages({
    global: TempStorage(),
    api: TempStorage(),
    session: TempStorage(),
    temp: TempStorage()
})

import { useState } from "react"
import { AppCtx } from "components/context"
import { createRoot } from "react-dom/client"
import { FormContent } from "./ui-demo/form"
import { TreeContent } from "./ui-demo/tree"

function MainLayout() {
    const [main, setMain] = useState(1)

    const buttonCls = index => {
        const cls = ["px-3 py-1 border border-button-border"]
        if (index === main) {
            cls.push("bg-active-bg text-active-text")
        } else {
            cls.push("bg-button-bg text-button-text")
        }
        return cls.join(" ")
    }

    const config = {}
    return (
        <AppCtx config={config}>
            <div className="stack-v full overflow-hidden">
                <div className="p-2 text-sm stack-h gap-2 bg-header-bg">
                    <button className={buttonCls(0)} onClick={() => setMain(0)}>
                        Form
                    </button>
                    <button className={buttonCls(1)} onClick={() => setMain(1)}>
                        Tree
                    </button>
                </div>
                <div className="auto overflow-auto bg-app-bg text-app-text">
                    {main === 0 && <FormContent />}
                    {main === 1 && <TreeContent />}
                </div>
            </div>
        </AppCtx>
    )
}

function UiShowroomApp() {
    return (
        <>
            <MainLayout />
            <div id="modals" />
        </>
    )
}

controller.registerApp("ui", () => {
    document.body.innerHTML = '<div id="app"></div>'
    const root = createRoot(document.getElementById("app"))
    root.render(<UiShowroomApp />)
})

controller.startApp("ui")
