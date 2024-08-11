import { Fragment } from "react"
import { PluginRegistry } from "core/plugin"
import { Checkbox } from "./form"
import { useComponentUpdate } from "./common"

function PluginsOverview({}) {
    const update = useComponentUpdate()
    const allPlugins = PluginRegistry.getAll()

    return (
        <div className="stack-v divide-y divide-app-text/50 w-full">
            <div className="pb-1">Plugins:</div>
            <div className="grid gap-1 py-1 grid-cols-[min-content_auto]">
                {allPlugins.map((plugin, i) => {
                    return (
                        <Fragment key={i}>
                            <div className="px-2">
                                <Checkbox
                                    value={plugin.active}
                                    set={(value) => {
                                        plugin.setActive(value)
                                        update()
                                    }}
                                />
                            </div>
                            <div className="stack-v">
                                <div>{plugin.name}</div>
                                {plugin.description && (
                                    <div className="text-app-text/50 text-xs">
                                        {plugin.description}
                                    </div>
                                )}
                            </div>
                        </Fragment>
                    )
                })}
            </div>
        </div>
    )
}

function Settings({}) {
    return (
        <div className="p-3">
            <PluginsOverview />
        </div>
    )
}

export { Settings }
