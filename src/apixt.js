/* webpackIgnore: true */
import { createRoot } from "react-dom/client"
import { ApiExtenderApp } from "./components/app"
import { d } from "core/helper"

const controller = window.controller
if (!controller) throw Error(`No controller found in window object`)

let root = null

controller.registerApp(
    "apixt",
    (config) => {
        controller.clearJwtCookie()
        if (!config.baseUrl) {
            config.baseUrl = window.location.href
        }
        document.body.innerHTML = '<div id="app"></div>'
        root = createRoot(document.getElementById("app"))
        root.render(<ApiExtenderApp config={config} />)
    },
    () => {
        root.unmount()
    }
)
