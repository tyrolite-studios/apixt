import { AbstractPlugin, PluginRegistry } from "core/plugin"
import { RequestBuilderWindow } from "./components"
import { d } from "core/helper"

class Plugin extends AbstractPlugin {
    get id() {
        return "requestBuilder"
    }

    get name() {
        return "Request Builder"
    }

    get description() {
        return "Build and fire HTTP Requests"
    }

    get defaultActive() {
        return true
    }

    init() {
        this.addHeaderButton({
            id: "builder",
            name: "Request..."
        })
    }

    getWindows(props) {
        return <RequestBuilderWindow key={this.id} {...props} />
    }
}

PluginRegistry.add(new Plugin())
