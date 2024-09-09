import { Fragment, useContext, useState } from "react"
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
    ColorCells
} from "./form"
import { useComponentUpdate, useConfirmation, EntityStack } from "./common"
import { AppContext } from "./context"
import { Tabs, Tab, Stack, OkCancelLayout, Centered } from "./layout"
import { d } from "core/helper"
import { useModalWindow } from "./modal"

function PluginsOverview({}) {
    const aCtx = useContext(AppContext)

    const Confirmation = useConfirmation()
    const update = useComponentUpdate()
    const allPlugins = PluginRegistry.getAll()

    return (
        <>
            <div className="stack-v divide-y divide-app-text/20 w-full px-4 py-2">
                <div className="pb-1 text-sm">Plugins:</div>
                <div className="grid gap-1 py-1 px-2 grid-cols-[min-content_auto]">
                    {allPlugins.map((plugin, i) => {
                        return (
                            <Fragment key={i}>
                                <div className="px-2 text-sm">
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

            {Confirmation.Modals}
        </>
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

function General() {
    const [autoScroll, setAutoScroll] = useState(true)
    const [animations, setAnimations] = useState(true)
    const [indentation, setIndentation] = useState(4)
    const [history, setHistory] = useState(100)
    const [trapFocus, setTrapFocus] = useState(true)
    const [apiEnvs, setApiEnvs] = useState([
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
    ])
    return (
        <FormGrid className="px-4">
            <SectionCells name="Behaviour" />
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
            <CheckboxCells
                name="Trap focus:"
                value={trapFocus}
                set={setTrapFocus}
            />
            <SectionCells name="API environments" />
            <FullCell className="px-2">
                <ApiEnvStack apiEnvs={apiEnvs} setApiEnvs={setApiEnvs} />
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

function Layout({}) {
    const [width, setWidthRaw] = useState(800)
    const [height, setHeightRaw] = useState(800)
    const [wMax, setWMaxRaw] = useState(true)
    const [hMax, setHMaxRaw] = useState(true)
    const [sidebar, setSidebar] = useState(false)

    const setWMax = (value) => {
        root.style.setProperty("--app-max-width", value ? "100%" : width + "px")
        setWMaxRaw(value)
    }

    const setWidth = (value) => {
        root.style.setProperty("--app-max-width", value + "px")
        setWidthRaw(value)
    }

    const setHMax = (value) => {
        root.style.setProperty(
            "--app-max-height",
            value ? "100%" : height + "px"
        )
        setHMaxRaw(value)
    }

    const setHeight = (value) => {
        root.style.setProperty("--app-max-height", value + "px")
        setHeightRaw(value)
    }

    return (
        <FormGrid className="px-4">
            <SectionCells name="Layout" />
            <RadioCells
                name="Navigation:"
                value={sidebar}
                set={setSidebar}
                options={[
                    { id: false, name: "Header" },
                    { id: true, name: "Sidebar" }
                ]}
            />
            <DimInputsCells
                name="Max width:"
                min={600}
                max={2000}
                value={width}
                setValue={setWidth}
                unlimited={wMax}
                setUnlimited={setWMax}
            />
            <DimInputsCells
                name="Max height:"
                min={400}
                max={2000}
                value={height}
                setValue={setHeight}
                unlimited={hMax}
                setUnlimited={setHMax}
            />
            <SectionCells name="Theme" />
            <ColorCells name="Header color:" value="#4d5c82" />
        </FormGrid>
    )
}

function KeyBindings({}) {
    return (
        <FormGrid className="px-4">
            <SectionCells name="Key Bindings" />
        </FormGrid>
    )
}

function Settings({ close }) {
    const confirm = useConfirmation()
    const resetToDefaults = () => {
        confirm.open({
            msg: "Do you really want to reset all settings to the default values?",
            confirmed: () => d("DO IT!")
        })
    }
    return (
        <>
            <OkCancelLayout
                submit
                cancel={close}
                ok={close}
                buttons={[{ name: "Before", icon: "visibility" }]}
                secondaryButtons={[
                    { name: "Reset to defaults", onPressed: resetToDefaults }
                ]}
            >
                <Tabs persistId="settings">
                    <Tab name="General" active>
                        <General />
                    </Tab>

                    <Tab name="Plugins">
                        <PluginsOverview />
                    </Tab>

                    <Tab name="Layout / Theme">
                        <Layout />
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
