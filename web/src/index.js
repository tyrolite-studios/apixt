import "./index.css"
import { createRoot } from "react-dom/client"
import { MainLayout } from "./ui/components"

console.log("Booting apixt...")

function toggleCodeBlock(elem) {
    while (!elem.classList.contains("dumpbox")) {
        elem = elem.parentNode
    }
    elem.classList.toggle("open")
}

function toggleSessionBlock(elem) {
    elem.parentNode.classList.toggle("extended")
}

const dumpParam = "dump"

function reload(hash) {
    const currentURL = new URL(window.location.href)
    const searchParams = currentURL.searchParams

    console.log(hash)
    if (hash === null) {
        searchParams.delete(dumpParam)
    } else if (hash !== undefined) {
        if (searchParams.has(dumpParam)) {
            searchParams.set(dumpParam, hash)
        } else {
            searchParams.append(dumpParam, hash)
        }
    }
    window.location.href = currentURL.toString()
}

// Clear the existing HTML content

addEventListener("DOMContentLoaded", () => {
    console.log("domloaded")
    document.body.innerHTML = '<div id="app"></div>'
    const root = createRoot(document.getElementById("app"))
    root.render(<MainLayout />)
})
