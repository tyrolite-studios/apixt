import { PluginRegistry } from "core/plugin"
import { Checkbox } from "components/form"
import { EntityStack } from "components/common"
import { Stack } from "components/layout"
import { d } from "core/helper"
import { SimpleMappingIndex } from "core/entity"

// TODO why not normal mappingIndex?
class PluginIndex extends SimpleMappingIndex {
    constructor(model) {
        super(model, "active")
    }

    getEntityProps() {
        return [...super.getEntityProps(), "name", "description"]
    }

    getEntityPropValue(index, prop) {
        if (["name", "description"].includes(prop)) {
            const id = this.getEntityValue(index)
            return PluginRegistry.getPlugin(id)[prop]
        }
        return super.getEntityPropValue(index, prop)
    }
}

function PluginStack({ pluginIndex }) {
    return (
        <EntityStack
            emptyMsg={"No plugins available"}
            entityIndex={pluginIndex}
            render={({ index, name, value, description, active }) => (
                <Stack key={value} gapped className="">
                    <div className="text-sm">
                        <Checkbox
                            tab={false}
                            value={active}
                            set={(value) => {
                                pluginIndex.setEntityPropValue(
                                    index,
                                    "active",
                                    value
                                )
                            }}
                        />
                    </div>
                    <div className="stack-v">
                        <div className="text-sm">{name}</div>
                        <div className="opacity-50 text-xs">{description}</div>
                    </div>
                </Stack>
            )}
        />
    )
}

export { PluginStack, PluginIndex }
