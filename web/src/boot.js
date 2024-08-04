/* webpackIgnore: true */
import { createRoot } from "react-dom/client"
import { ApiExtenderApp } from "./components/app"

const runApiExtender = (config) => {
    addEventListener(
        "DOMContentLoaded",
        () => {
            document.body.innerHTML = '<div id="app"></div>'
            const root = createRoot(document.getElementById("app"))
            root.render(<ApiExtenderApp config={config} />)
        },
        { once: true }
    )
}

window.runApiExtender = runApiExtender

export { runApiExtender }
