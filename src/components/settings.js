import { Fragment, useContext, useState } from "react"
import { PluginRegistry } from "core/plugin"
import {
    Button,
    Checkbox,
    FormGrid,
    NumberCells,
    InputCells,
    SelectCells,
    RadioCells,
    TextareaCells,
    CheckboxCells,
    CustomCells,
    SectionCells,
    OkCancelForm,
    Submit,
    Form
} from "./form"
import { useComponentUpdate, useConfirmation } from "./common"
import { AppContext } from "./context"
import { Tabs, Tab } from "./layout"
import { d } from "core/helper"

function PluginsOverview({}) {
    const aCtx = useContext(AppContext)

    const Confirmation = useConfirmation()
    const update = useComponentUpdate()
    const allPlugins = PluginRegistry.getAll()

    return (
        <>
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
                                                plugins:
                                                    PluginRegistry.getStates()
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
                        onPressed={() =>
                            Confirmation.open({
                                msg: "Do you really want to clear all settings?",
                                confirmed: () => d("CLEAR!") //aCtx.clearSettings()
                            })
                        }
                    />
                </div>
            </div>

            {Confirmation.Modals}
        </>
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

function General() {
    const [autoScroll, setAutoScroll] = useState(true)
    const [animations, setAnimations] = useState(true)
    const [indentation, setIndentation] = useState(4)
    const [history, setHistory] = useState(100)
    return (
        <FormGrid className="p-2">
            <NumberCells
                name="Code Indentation:"
                value={indentation}
                set={setIndentation}
                min={0}
                max={9}
            />
            <NumberCells
                name="Max history entries:"
                value={history}
                set={setHistory}
                min={0}
                max={9999}
            />
            <CheckboxCells
                name="Animations:"
                value={animations}
                set={setAnimations}
            />
            <CheckboxCells
                name="Auto scroll content:"
                value={autoScroll}
                set={setAutoScroll}
            />
            <SectionCells name="API environments" />
            <CustomCells name="API environments:">Selector...</CustomCells>
        </FormGrid>
    )
}

function Settings({ close }) {
    return (
        <OkCancelForm submit cancel={close} ok={close}>
            <Tabs persistId="settings">
                <Tab name="General" active>
                    <General />
                </Tab>

                <Tab name="Layout / Theme"></Tab>

                <Tab name="Plugins">
                    <PluginsOverview />
                </Tab>

                <Tab name="About">
                    <About />
                </Tab>
            </Tabs>
        </OkCancelForm>
    )
}

export { Settings }
