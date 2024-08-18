/* webpackIgnore: true */
import { createRoot, unmount } from "react-dom/client"
import { ApiExtenderApp } from "./components/app"
import { d } from "core/helper"

let root = null

const runApiExtender = (config) => {
    document.body.innerHTML = '<div id="app"></div>'
    root = createRoot(document.getElementById("app"))
    root.render(<ApiExtenderApp config={config} />)
}

const destroyApiExtender = () => {
    root.unmount()
}

window.runApiExtender = runApiExtender
window.destroyApiExtender = destroyApiExtender

export { runApiExtender }
