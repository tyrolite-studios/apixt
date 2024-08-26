import { AbstractPlugin, PluginRegistry } from "core/plugin"
import { getStringifiedJSON } from "../../util"
import { d } from "core/helper"

class Plugin extends AbstractPlugin {
    get id() {
        return "syntaxHighlighter"
    }

    get name() {
        return "Syntax Highlighter"
    }

    get description() {
        return "Add syntax highlighting to JSON output in code blocks"
    }

    get defaultActive() {
        return true
    }

    init() {
        this.setContentHandler({
            type: "decorator",
            match: (mime) => mime.endsWith("/json"),
            exec: (input, ctx) => {
                try {
                    const parsed = JSON.parse(input)
                    return getStringifiedJSON(parsed, ctx.settings.tabSpaces)
                } catch (e) {
                    return "Error parsing JSON: " + e.message
                }
            }
        })
    }
}

PluginRegistry.add(new Plugin())
