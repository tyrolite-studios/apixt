import "./index.css"
import { LoginApp } from "./components/login"

const runLoginApp = (config) => {
    const createApp = () => {
        LoginApp({ config })
    }
    if (document.readyState === "loading") {
        addEventListener("DOMContentLoaded", createApp, { once: true })
    } else {
        createApp()
    }
}

window.runLoginApp = runLoginApp

runLoginApp({ baseUrl: "http://localhost:8082" })
