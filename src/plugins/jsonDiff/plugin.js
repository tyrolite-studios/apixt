import { AbstractPlugin, PluginRegistry, HOOKS } from "core/plugin"
import { d } from "core/helper"
import { JsonDiffWindow } from "./components"

class Plugin extends AbstractPlugin {
    get id() {
        return "jsondiff"
    }

    get name() {
        return "JSON Diff"
    }

    get description() {
        return "Provides a JSON diff"
    }

    get defaultActive() {
        return true
    }

    init() {}

    getWindows(props) {
        return <JsonDiffWindow key={this.id} {...props} />
    }
}

PluginRegistry.add(new Plugin())
