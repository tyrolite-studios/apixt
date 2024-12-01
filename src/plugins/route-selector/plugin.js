import { AbstractPlugin, PluginRegistry } from "core/plugin"
import { RoutesModal } from "./components"
import { d } from "core/helper"

class Plugin extends AbstractPlugin {
    get id() {
        return "routeSelector"
    }

    get name() {
        return "Route Selector"
    }

    get description() {
        return "Allows the quick selection of API routes"
    }

    get defaultActive() {
        return true
    }

    get defaultSettings() {
        return {
            detailed: false
        }
    }

    init() {
        this.addHeaderButton({ id: "selector", name: "Routes..." })
        this.openEditorHandler = null
    }

    setOpenEditor(value) {
        this.openEditorHandler = value
    }

    openEditor(props) {
        if (!this.openEditorHandler) return

        this.openEditorHandler(props)
    }

    getWindows(props) {
        return <RoutesModal key={this.id} {...props} />
    }
}

PluginRegistry.add(new Plugin())
