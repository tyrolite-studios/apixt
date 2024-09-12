import { Fragment, useContext, useState, useRef, useMemo } from "react"
import { PluginRegistry } from "core/plugin"
import {
    Checkbox,
    FormGrid,
    NumberCells,
    InputCells,
    RadioCells,
    CheckboxCells,
    FullCell,
    CustomCells,
    SectionCells,
    Slider,
    Number,
    Picker,
    ColorCells
} from "./form"
import { useConfirmation, EntityStack } from "./common"
import { AppContext } from "./context"
import { Div, Tabs, Tab, Stack, OkCancelLayout, Centered } from "./layout"
import { d, isString, cloneDeep } from "core/helper"
import { useModalWindow } from "./modal"

function PluginsOverview({ plugins, setPlugins }) {
    const getPluginSetter = (prop) => {
        return (value) => {
            setPlugins({ ...plugins, [prop]: value })
        }
    }
    const allPlugins = PluginRegistry.getAll()

    return (
        <div className="stack-v divide-y divide-app-text/20 w-full px-4 py-2">
            <div className="pb-1 text-sm">Plugins:</div>
            <div className="grid gap-1 py-1 px-2 grid-cols-[min-content_auto]">
                {allPlugins.map((plugin, i) => {
                    return (
                        <Fragment key={i}>
                            <div className="px-2 text-sm">
                                <Checkbox
                                    value={plugins[plugin.id]}
                                    set={getPluginSetter(plugin.id)}
                                />
                            </div>
                            <div className="stack-v">
                                <div className="text-sm">{plugin.name}</div>
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

function About() {
    return (
        <Centered>
            <div className="stack-v gap-2 p-2">
                <div className="text-2xl">API Extender</div>
                <div className="text-sm">
                    Version 0.0.1 (Frontend)
                    <br />
                    <span className="opacity-50 text-xs">
                        <a href="">www.github.com/tyrolite-studios/apixt</a>
                    </span>
                    <br />
                    <br />
                    Hosting API Language: NodeJS
                    <br />
                    API Extender Backend v0.0.1
                    <br />
                    <br />
                    <span className="text-xs opacity-50">
                        © 2024 TyroLite Studios
                    </span>
                </div>
                <div className="text-sm"></div>
            </div>
        </Centered>
    )
}

function NewApiEnv({ close, model, save }) {
    const [name, setName] = useState(model?.name || "")
    const [url, setUrl] = useState(model?.url || "")
    const [cors, setCors] = useState(
        model?.cors === undefined ? false : model.cors
    )
    return (
        <OkCancelLayout
            cancel={close}
            ok={() => save({ name, url, cors })}
            submit
        >
            <FormGrid className="p-4">
                <InputCells
                    name="Name:"
                    value={name}
                    set={setName}
                    autoFocus
                    required
                />
                <InputCells name="URL:" value={url} set={setUrl} required />
                <CheckboxCells name="CORS:" value={cors} set={setCors} />
            </FormGrid>
        </OkCancelLayout>
    )
}

function ApiEnvStack({ apiEnvs, setApiEnvs }) {
    const NewEnvModal = useModalWindow()

    return (
        <>
            <EntityStack
                emptyMsg={
                    "No API environments available. Add one by clicking on the new button above"
                }
                render={({ id, name, url }) => (
                    <Stack vertical key={name} className="">
                        <div className="text-sm">{name}</div>
                        <div className="text-app-text text-xs">
                            URL: <span className="text-app-text/50">{url}</span>
                        </div>
                    </Stack>
                )}
                set={setApiEnvs}
                newItem={() =>
                    NewEnvModal.open({
                        save: (model) => {
                            setApiEnvs([...apiEnvs, model])
                            NewEnvModal.close()
                        }
                    })
                }
                editItem={(i) =>
                    NewEnvModal.open({
                        model: apiEnvs[i],
                        save: (model) => {
                            const newApiEnvs = [...apiEnvs]
                            newApiEnvs[i] = model
                            setApiEnvs(newApiEnvs)
                            NewEnvModal.close()
                        }
                    })
                }
                deleteItems={(selected) =>
                    setApiEnvs(
                        apiEnvs.filter(
                            (item, index) => !selected.includes(index)
                        )
                    )
                }
                items={apiEnvs}
            />

            <NewEnvModal.content name="New API environment">
                <NewApiEnv {...NewEnvModal.props} />
            </NewEnvModal.content>
        </>
    )
}

function General({ general, setGeneral }) {
    const getGeneralSetter = (prop) => {
        return (value) => {
            const newGeneral = { ...general }
            newGeneral[prop] = value
            setGeneral(newGeneral)
        }
    }
    return (
        <FormGrid className="px-4">
            <SectionCells name="Behaviour" />
            <NumberCells
                name="Code Indentation:"
                value={general.indentation}
                set={getGeneralSetter("indentation")}
                min={0}
                max={9}
            />
            <NumberCells
                name="Max history entries:"
                value={general.history}
                set={getGeneralSetter("history")}
                min={0}
                max={9999}
            />
            <CheckboxCells
                name="Animations:"
                value={general.animations}
                set={getGeneralSetter("animations")}
            />
            <CheckboxCells
                name="Auto scroll content:"
                value={general.autoScroll}
                set={getGeneralSetter("autoScroll")}
            />
            <CheckboxCells
                name="Trap focus:"
                value={general.trapFocus}
                set={getGeneralSetter("trapFocus")}
            />
            <SectionCells name="API environments" />
            <FullCell className="px-2">
                <ApiEnvStack
                    apiEnvs={general.apiEnvs}
                    setApiEnvs={getGeneralSetter("apiEnvs")}
                />
            </FullCell>
        </FormGrid>
    )
}

function DimInputsCells({
    name,
    min,
    max,
    value,
    setValue,
    unlimited,
    setUnlimited
}) {
    return (
        <CustomCells name={name}>
            <Stack vertical gapped>
                <Stack gapped>
                    <Checkbox value={unlimited} set={setUnlimited} />
                    <div className="text-xs">Unlimited</div>
                </Stack>
                <Stack gapped width="400px">
                    <Number
                        min={min}
                        max={max}
                        value={value}
                        set={setValue}
                        disabled={unlimited}
                    />
                    <Slider
                        full
                        className="auto"
                        min={min}
                        max={max}
                        value={value}
                        set={setValue}
                        tab={false}
                        disabled={unlimited}
                    />
                </Stack>
            </Stack>
        </CustomCells>
    )
}

const root = document.documentElement

function Layout({ layout, setLayout }) {
    const getLayoutSetter = (prop) => {
        return (value) => {
            const newLayout = { ...layout }
            newLayout[prop] = value
            setLayout(newLayout)
        }
    }
    return (
        <FormGrid className="px-4">
            <SectionCells name="Layout" />
            <RadioCells
                name="Navigation:"
                value={layout.sidebar}
                set={getLayoutSetter("sidebar")}
                options={[
                    { id: false, name: "Header" },
                    { id: true, name: "Sidebar" }
                ]}
            />
            <DimInputsCells
                name="Max width:"
                min={600}
                max={2000}
                value={layout.width}
                setValue={getLayoutSetter("width")}
                unlimited={layout.wMax}
                setUnlimited={getLayoutSetter("wMax")}
            />
            <DimInputsCells
                name="Max height:"
                min={400}
                max={2000}
                value={layout.height}
                setValue={getLayoutSetter("height")}
                unlimited={layout.hMax}
                setUnlimited={getLayoutSetter("hMax")}
            />
            <SectionCells name="Theme" />
            <ColorCells name="Header color:" value="#4d5c82" />
        </FormGrid>
    )
}

function KeyBindings({}) {
    const aContext = useContext(AppContext)
    const [bindings, setBindings] = useState(() => {
        const result = []
        for (const [action, key] of Object.entries(
            aContext.hotKeyActions.action2hotKey
        )) {
            result.push({ id: action, action, key })
        }
        return result
    })

    return (
        <FormGrid className="px-4">
            <SectionCells name="Key Bindings" />
            <FullCell>
                <Picker
                    full
                    options={bindings}
                    renderer={({ action, key }) => {
                        const rawKeys = isString(key) ? key.split(" ") : []
                        const keys = []
                        if (rawKeys.length) {
                            let firstKey = rawKeys.shift()
                            if (rawKeys.length > 0) {
                                switch (firstKey) {
                                    case "c":
                                        firstKey = "Ctrl"
                                        break

                                    case "m":
                                        firstKey = "Cmd"
                                        break
                                }
                            }
                            keys.push(firstKey)
                            if (rawKeys.length > 0) keys.push(...rawKeys)
                        }
                        return (
                            <Stack key={action} className="gap-4">
                                <div className="stack-h text-app-text text-xs gap-2">
                                    <Div
                                        className="text-sm px-2"
                                        minWidth="68px"
                                    >
                                        {action}
                                    </Div>
                                    {keys.map((item, i) => (
                                        <>
                                            {i > 0 && (
                                                <div className="py-1 border-1 border-transparent">
                                                    +
                                                </div>
                                            )}
                                            <div className="bg-input-text/80 px-2 py-1 border border-1 border-app-text/50 rounded-lg">
                                                {item}
                                            </div>
                                        </>
                                    ))}
                                </div>
                            </Stack>
                        )
                    }}
                    pick={(i) => d("CHANGE", i)}
                />
            </FullCell>
        </FormGrid>
    )
}

const defaultSettings = {
    general: {
        autoScroll: true,
        animations: true,
        indentation: 4,
        history: 100,
        trapFocus: true,
        apiEnvs: [
            {
                id: 0,
                name: "Staging",
                url: "https://staging.myapi.com/",
                cors: true
            },
            {
                id: 0,
                name: "Production",
                url: "https://api.myapi.com/",
                cors: true
            }
        ]
    },
    layout: {
        width: 800,
        height: 800,
        wMax: true,
        hMax: true,
        sidebar: false
    }
}

function Settings({ close }) {
    const aContext = useContext(AppContext)
    const [layout, setLayoutRaw] = useState(() => {
        return { ...defaultSettings.layout }
    })
    const applyLayout = ({ width, height, wMax, hMax, sidebar }) => {
        root.style.setProperty("--app-max-width", wMax ? "100%" : width + "px")
        root.style.setProperty(
            "--app-max-height",
            hMax ? "100%" : height + "px"
        )
    }
    const setLayout = (newLayout) => {
        applyLayout(newLayout)
        setLayoutRaw(newLayout)
    }
    const [general, setGeneral] = useState(() => {
        return cloneDeep(defaultSettings.general)
    })
    const [plugins, setPluginsRaw] = useState(() => {
        return PluginRegistry.getStates()
    })
    const applyPlugins = (newPlugins) => {
        // PluginRegistry.setStates(newPlugins)
        /*
        aContext.setSettings({
            ...aContext.settings,
            plugins: newPlugins
        })
        */
    }
    const setPlugins = (newPlugins) => {
        const value = { ...newPlugins }
        applyPlugins(value)
        setPluginsRaw(value)
    }

    const backedUpSettings = useRef(null)
    const confirm = useConfirmation()
    const resetToDefaults = () => {
        confirm.open({
            msg: "Do you really want to reset all settings to the default values?",
            confirmed: () => {
                setGeneral(defaultSettings.general)
                setLayout(defaultSettings.layout)
                setPlugins(PluginRegistry.getDefaultStates())
            }
        })
    }

    const getSnapshot = () => {
        return {
            layout: { ...layout },
            general: cloneDeep(general),
            plugins: { ...plugins }
        }
    }

    const beforeSettings = useMemo(() => getSnapshot(), [])

    const applySettings = ({ layout, plugins }) => {
        applyLayout(layout)
        applyPlugins(plugins)
    }

    return (
        <>
            <OkCancelLayout
                submit
                cancel={() => {
                    applySettings(beforeSettings)
                    close()
                }}
                ok={() => close()}
                buttons={[
                    {
                        name: "Before",
                        icon: "visibility",
                        onPressed: () => {
                            backedUpSettings.current = getSnapshot()
                            setGeneral(beforeSettings.general)
                            setLayout(beforeSettings.layout)
                            setPlugins(beforeSettings.plugins)
                        },
                        onPressedEnd: () => {
                            setGeneral(backedUpSettings.current.general)
                            setLayout(backedUpSettings.current.layout)
                            setPlugins(backedUpSettings.current.plugins)
                        }
                    }
                ]}
                secondaryButtons={[
                    { name: "Reset to defaults", onPressed: resetToDefaults }
                ]}
            >
                <Tabs persistId="settings">
                    <Tab name="General" active>
                        <General general={general} setGeneral={setGeneral} />
                    </Tab>

                    <Tab name="Plugins">
                        <PluginsOverview
                            plugins={plugins}
                            setPlugins={setPlugins}
                        />
                    </Tab>

                    <Tab name="Layout / Theme">
                        <Layout layout={layout} setLayout={setLayout} />
                    </Tab>

                    <Tab name="Key bindings">
                        <KeyBindings />
                    </Tab>

                    <Tab name="About">
                        <About />
                    </Tab>
                </Tabs>
            </OkCancelLayout>
            {confirm.Modals}
        </>
    )
}

export { Settings }
