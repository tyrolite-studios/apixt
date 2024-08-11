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

    init() {
        this.addButton("selector", "Routes...")
        this.openEditorHandler = null
    }

    setOpenEditor(value) {
        this.openEditorHandler = value
    }

    openEditor(props) {
        if (!this.openEditorHandler) return

        this.openEditorHandler(props)
    }

    getContent(props) {
        return <RoutesModal key={this.id} {...props} />
    }
}

PluginRegistry.add(new Plugin())
