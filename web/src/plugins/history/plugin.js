import { AbstractPlugin, PluginRegistry } from "../../core/plugin"
import { HistoryWindow, HistoryWidget } from "./components"

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
        this.addButton("history", "History...")
    }

    getWidget(props) {
        return <HistoryWidget key={this.id} {...props} />
    }

    getContent(props) {
        return <HistoryWindow key={this.id} {...props} />
    }
}

PluginRegistry.add(new Plugin())
