import { AbstractPlugin, PluginRegistry } from "core/plugin"
import { d } from "core/helper"
import JSON5 from "json5"

class Plugin extends AbstractPlugin {
    get id() {
        return "json5"
    }

    get name() {
        return "Json5 Body Input"
    }

    get description() {
        return "Allows to enter body a body as JSON5 which is more human-friendly"
    }

    get defaultActive() {
        return true
    }

    registerContext(ctx) {
        ctx.registerMode("json5", {
            name: "JSON5",
            isValid: (value) => {
                try {
                    const parsed = JSON5.parse(value)
                    return parsed !== undefined
                } catch (e) {
                    return false
                }
            },
            format: (value) => {
                const { globalSettings } = ctx
                const parsed = JSON5.parse(value)
                return JSON5.stringify(parsed, null, globalSettings.tabWidth)
            },
            convertTo: (value, mode) => {
                if (mode !== "json") return value

                const { globalSettings } = ctx
                try {
                    const parsed = JSON5.parse(value)
                    return JSON.stringify(parsed, null, globalSettings.tabWidth)
                } catch (e) {
                    return value
                }
            },
            targetMode: "json"
        })
    }

    activateInContext(ctx) {
        ctx.linkModeWithBodyType("json", "json5")
    }
}

PluginRegistry.add(new Plugin())
