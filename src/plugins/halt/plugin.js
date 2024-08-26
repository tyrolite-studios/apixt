import { AbstractPlugin, PluginRegistry } from "core/plugin"
import { d } from "core/helper"
import { Button } from "../../components/form"

class Plugin extends AbstractPlugin {
    get id() {
        return "halt"
    }

    get name() {
        return "Halt"
    }

    get description() {
        return "Allows to halt the execution of an API requests at a certain point"
    }

    get defaultActive() {
        return true
    }

    init() {
        this.addBlockButton({
            id: "halt",
            name: "Stop here",
            isActive: ({ hash }) => !!hash
        })
        this.setButtonHandler("halt", ({ ctx, hash }) => {
            ctx.haltContentStream(hash)
        })
    }
}

PluginRegistry.add(new Plugin())
