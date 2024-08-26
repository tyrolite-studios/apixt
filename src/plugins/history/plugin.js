import { AbstractPlugin, PluginRegistry, HOOKS } from "core/plugin"
import { HistoryWindow, HistoryWidget } from "./components"
import { d } from "core/helper"

class Plugin extends AbstractPlugin {
    get id() {
        return "history"
    }

    get name() {
        return "History"
    }

    get description() {
        return "Stores the last requests and makes them available in a widget and a button in the navigation bar"
    }

    get defaultActive() {
        return true
    }

    init() {
        this.addHeaderButton({
            id: "history",
            name: "History..."
        })
        this.addHook(HOOKS.FETCH_CONTENT, (request) => {
            d("History hook...", request)
        })
    }

    getWidget(props) {
        return <HistoryWidget key={this.id} {...props} />
    }

    getWindows(props) {
        return <HistoryWindow key={this.id} {...props} />
    }
}

PluginRegistry.add(new Plugin())
