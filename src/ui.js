import "./index.css"
import controller from "core/controller"

import { useState } from "react"
import { AppCtx } from "components/context"
import { createRoot } from "react-dom/client"
import { FormContent } from "./ui-demo/form"
import { TreeContent } from "./ui-demo/tree"
import { TableContent } from "./ui-demo/table.js"
import { StackLayoutsContent } from "./ui-demo/stack-layouts.js"
import { StackContent } from "./ui-demo/stack.js"
import { useRegisterAppListeners } from "./components/common"

function MainInner() {
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

    const onFocus = useRegisterAppListeners()

        return (
        <div onFocus={onFocus} className="stack-v full overflow-hidden">
        <div className="p-2 text-sm stack-h gap-2 bg-header-bg">
        <button className={buttonCls(0)} onClick={() => setMain(0)}>
    Form
    </button>
    <button className={buttonCls(1)} onClick={() => setMain(1)}>
        Stack
    </button>
    <button className={buttonCls(2)} onClick={() => setMain(2)}>
        Tree
    </button>
    <button className={buttonCls(3)} onClick={() => setMain(3)}>
        Table
    </button>
    <button className={buttonCls(4)} onClick={() => setMain(4)}>
        Stack-Layouts
    </button>
</div>
    <div className="auto overflow-auto bg-app-bg text-app-text">
        {main === 0 && <FormContent />}
        {main === 1 && <StackContent />}
        {main === 2 && <TreeContent />}
        {main === 3 && <TableContent />}
        {main === 4 && <StackLayoutsContent />}
    </div>
</div>)

}

function MainLayout() {
    const config = {}
    return (
        <AppCtx config={config}>
            <MainInner />
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

controller.storePrefix = 'tls.ui.'
controller.startApp("ui")
