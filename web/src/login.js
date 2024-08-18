import "./index.css"
import { BrowserStorage } from "core/storage"
import { createRoot } from "react-dom/client"
import { LoginApp } from "./components/login"
import { d } from "core/helper"

const runLoginApp = (config) => {
    const createApp = () => {
        document.body.innerHTML = '<div id="app"></div>'
        const root = createRoot(document.getElementById("app"))
        root.render(<LoginApp config={config} />)
    }
    if (document.readyState === "loading") {
        addEventListener("DOMContentLoaded", createApp, { once: true })
    } else {
        createApp()
    }
}

window.runLoginApp = runLoginApp

runLoginApp({ baseUrl: "http://localhost:8082" })
