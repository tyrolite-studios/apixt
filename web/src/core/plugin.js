import { Button } from "components/form"
import { d } from "core/helper"

const implement = (name) => {
    throw Error(`Plugin must implement getter ${name}`)
}

class AbstractPlugin {
    constructor() {
        this._active = this.defaultActive
        this._buttons = []
        this._buttonHandler = {}
        this._contentHandler = []

        this.init()
    }

    init() {}

    addButton(id, name = id) {
        this._buttons.push({
            id,
            name,
            onClick: () => {
                const handler = this._buttonHandler[id]
                if (!handler) return

                handler({ plugin: this, ctx })
            }
        })
    }

    setContentHandler(handler) {
        this._contentHandler.push(handler)
    }

    setButtonHandler(id, handler) {
        this._buttonHandler[id] = handler
    }

    setActive(value) {
        this._active = value
        PluginRegistry.updateApp()
    }

    get id() {
        implement("id")
    }

    get name() {
        implement("name")
    }

    get description() {
        return ""
    }

    get defaultActive() {
        implement("defaultActive")
    }

    get buttons() {
        return this._buttons
    }

    get contentHandler() {
        return this._contentHandler
    }

    getContent() {
        return
    }

    getWidget() {
        return
    }

    get active() {
        return this._active
    }
}

const plugins = []
const id2plugin = new Map()
let ctx = null

const PluginRegistry = {
    add(plugin) {
        plugins.push(plugin)
        id2plugin.set(plugin.id, plugin)
    },

    has(id) {
        return id2plugin.has(id)
    },

    getActivePlugin(id) {
        return id2plugin.get(id)
    },

    isActive(id) {
        const plugin = id2plugin.get(id)
        return !plugin ? false : plugin.active
    },

    setContext(value) {
        ctx = value
    },

    updateApp() {
        if (ctx) {
            ctx.update()
        }
    },

    getAll() {
        return plugins
    },

    getActivePlugins() {
        const result = []
        for (const plugin of plugins) {
            if (!plugin.active) continue
            result.push(plugin)
        }
        return result
    },

    getContentPipeline(mime) {
        const pipeline = []

        if (mime) {
            const activePlugins = this.getActivePlugins()
            for (const plugin of activePlugins) {
                for (const handler of plugin.contentHandler) {
                    if (!handler.match(mime)) continue

                    pipeline.push(handler.exec)
                }
            }
        }
        if (pipeline.length === 0) {
            switch (mime) {
                case "application/json":
                case "text/json":
                    pipeline.push((input) => {
                        try {
                            const parsed = JSON.parse(input)
                            return JSON.stringify(parsed, null, 4)
                        } catch (e) {
                            return "Error parsing JSON: " + e.message
                        }
                    })
                    break
            }
        }
        return pipeline
    },

    get buttons() {
        const result = []
        for (const plugin of plugins) {
            if (!plugin.active || !plugin.buttons.length) continue

            result.push(...plugin.buttons)
        }
        return result
    },

    get components() {
        const result = []
        for (const plugin of plugins) {
            const content = plugin.getContent({ plugin })
            if (!content) continue

            result.push(content)
        }
        return result
    },

    get widgets() {
        const result = []
        for (const plugin of plugins) {
            const widget = plugin.getWidget({ plugin })
            if (!widget || !plugin.active) continue

            result.push(widget)
        }
        return result
    }
}

export { AbstractPlugin, PluginRegistry }
