import { Fragment, useContext } from "react"
import { PluginRegistry } from "core/plugin"
import { Button, Checkbox } from "./form"
import { useComponentUpdate } from "./common"
import { AppContext } from "./context"
import { Tabs, Tab } from "./layout"
import { d } from "core/helper"

function PluginsOverview({}) {
    const aCtx = useContext(AppContext)
    const update = useComponentUpdate()
    const allPlugins = PluginRegistry.getAll()

    return (
        <div className="stack-v divide-y divide-app-text/50 w-full px-2">
            <div className="pb-1">Plugins:</div>
            <div className="grid gap-1 py-1 grid-cols-[min-content_auto]">
                {allPlugins.map((plugin, i) => {
                    return (
                        <Fragment key={i}>
                            <div className="px-2">
                                <Checkbox
                                    value={plugin.active}
                                    set={(value) => {
                                        aCtx.settings.plugins[plugin.id] =
                                            plugin.setActive(value)
                                        aCtx.setSettings({
                                            ...aCtx.settings,
                                            plugins: PluginRegistry.getStates()
                                        })
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

            <div className="p-1">Settings:</div>
            <div className="p-2">
                <Button
                    name="Default settings"
                    onPressed={() => aCtx.clearSettings()}
                />
            </div>
        </div>
    )
}

function About() {
    return (
        <div className="stack-v gap-2 p-2">
            <div className="text-2xl">API Extender</div>
            <div className="text-sm">Version 0.0.1 (Frontend)</div>
        </div>
    )
}

function Settings({}) {
    return (
        <Tabs persistId="settings">
            <Tab name="General" active>
                TODO...
            </Tab>

            <Tab name="Layout / Theme"></Tab>

            <Tab name="Plugins">
                <PluginsOverview />
            </Tab>

            <Tab name="About">
                <About />
            </Tab>
        </Tabs>
    )
}

export { Settings }
