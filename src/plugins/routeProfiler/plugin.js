import { AbstractPlugin, PluginRegistry, HOOKS } from "core/plugin"
import { ProfilerWindow } from "./components"
import { d } from "core/helper"

class Plugin extends AbstractPlugin {
    get id() {
        return "routeProfiler"
    }

    get name() {
        return "Route Profiler"
    }

    get description() {
        return "Profiles a Route"
    }

    get defaultActive() {
        return true
    }

    init() {
        this.addHeaderButton({
            id: "routeProfiler",
            name: "Profiler..."
        })
    }

    getWindows(props) {
        return <ProfilerWindow key={this.id} {...props} />
    }
}

PluginRegistry.add(new Plugin())
