import { Button } from "components/form"
import { d } from "core/helper"

const implement = (name) => {
    throw Error(`Plugin must implement getter ${name}`)
}

class AbstractPlugin {
    constructor() {
        this._active = this.defaultActive
        this._headerButtons = []
        this._blockButtons = []
        this._buttonHandler = {}
        this._contentHandler = []

        this.init()
    }

    init() {}

    addHook(id, handler) {
        PluginRegistry.addHook(id, this, handler)
    }

    assertButtonProps(props, registeredIds) {
        const { id, onPressed, name } = props

        let error = null
        if (!id) {
            error = `Button must have an id property with a non-empty value`
        } else if (registeredIds.includes(id)) {
            error = `Button with id "${id}" already exists`
        } else if (onPressed) {
            error = `Button "${id}" was added with an onPressed handler. Please use setButtonHandler("${id}", handler) instead`
        }
        if (!name) {
            props.name = id
        }
        if (!error) return

        throw Error(`Plugin "${this.id}": ${error}!`)
    }

    addHeaderButton(props) {
        this.assertButtonProps(
            props,
            this._headerButtons.map((item) => item.id)
        )

        this._headerButtons.push({
            ...props,
            onPressed: () => {
                const handler = this._buttonHandler[props.id]
                if (!handler) return

                handler({ plugin: this, ctx })
            }
        })
    }

    addBlockButton({ isActive = () => true, ...props }) {
        this.assertButtonProps(
            props,
            this._blockButtons.map((item) => item.id)
        )
        this._blockButtons.push({
            ...props,
            isActive
        })
    }

    getBlockButtons(props) {
        const buttons = []
        for (const { id, name, isActive } of this._blockButtons) {
            if (!isActive(props)) continue

            buttons.push(
                <Button
                    key={id}
                    name={name}
                    onPressed={() => {
                        const handler = this._buttonHandler[id]
                        if (!handler) return

                        handler({ plugin: this, ...props })
                    }}
                />
            )
        }
        return buttons
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

    get headerButtons() {
        return this._headerButtons
    }

    get contentHandler() {
        return this._contentHandler
    }

    getWindows() {
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

const HOOKS = {
    FETCH_CONTENT: 1
}

const allHooks = {}

const PluginRegistry = {
    add(plugin) {
        plugins.push(plugin)
        id2plugin.set(plugin.id, plugin)
    },

    addHook(id, plugin, handler) {
        if (!allHooks[id]) allHooks[id] = []
        allHooks[id].push({ plugin, handler })
    },

    applyHooks(id, props) {
        const idHooks = allHooks[id]
        if (!idHooks) return props

        for (const { plugin, handler } of idHooks) {
            if (!plugin.active) continue

            handler(props)
        }
        return props
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

    getStates() {
        const states = {}
        for (const plugin of plugins) {
            states[plugin.id] = plugin.active
        }
        return states
    },

    setStates(states) {
        for (const [id, state] of Object.entries(states)) {
            const plugin = id2plugin.get(id)
            if (plugin) plugin.setActive(state)
        }
    },

    getDefaultStates() {
        const states = {}
        for (const plugin of plugins) {
            states[plugin.id] = plugin.defaultActive
        }
        return states
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

    get headerButtons() {
        const result = []
        for (const plugin of plugins) {
            if (!plugin.active || !plugin.headerButtons.length) continue

            result.push(...plugin.headerButtons)
        }
        return result
    },

    getBlockButtons(props) {
        const result = []
        const activePlugins = PluginRegistry.getActivePlugins()
        for (const plugin of activePlugins) {
            const buttons = plugin.getBlockButtons(props)
            if (!buttons.length) continue

            result.push(...buttons)
        }
        return result
    },

    get windows() {
        const result = []
        for (const plugin of plugins) {
            const content = plugin.getWindows({ plugin })
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

export { AbstractPlugin, PluginRegistry, HOOKS }
