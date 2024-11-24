import { useState, useMemo, useContext } from "react"
import { FormGrid, InputCells, CustomCells, SelectCells } from "components/form"
import { EntityStack, useUpdateOnEntityIndexChanges } from "components/common"
import { OkCancelLayout, Icon } from "components/layout"
import { useModalWindow } from "components/modal"
import { SimpleMappingIndex, extractLcProps } from "core/entity"
import { MappingIndex } from "core/entity"
import { d } from "core/helper"
import { AppContext } from "../components/context"
import { ApiEnvIndex } from "entities/api-envs"

class ConstantIndex extends MappingIndex {
    constructor(model) {
        super(model, ["name", "constValue", "envValues"])
    }
}

function EnvOverrideForm({
    close,
    model,
    edit = false,
    save,
    envOptions = []
}) {
    const [value, setValue] = useState(model.value)
    const [overrideValue, setOverrideValue] = useState(model.overrideValue)
    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() => save({ value, overrideValue })}
        >
            <FormGrid>
                <SelectCells
                    name="Env"
                    options={envOptions}
                    value={value}
                    autoFocus={!edit}
                    set={setValue}
                />
                <InputCells
                    name="Value"
                    autoFocus={edit}
                    value={overrideValue}
                    set={setOverrideValue}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function EnvOverrideStack({ overrideIndex, apiEnvIndex, value2envName }) {
    const OverrideModal = useModalWindow()

    const allEnvOptions = useMemo(() => {
        const envOptions = []
        const envs = apiEnvIndex.getEntityObjects()
        for (const { value, name } of envs) {
            envOptions.push({ id: value, name })
        }
        return envOptions
    }, [])

    const allIds = overrideIndex.getPropValues("value")
    const actions = [
        {
            action: "add",
            name: "New",
            op: {
                exec: () => {
                    const model = {
                        overrideValue: "",
                        value: ""
                    }
                    OverrideModal.open({
                        model,
                        envOptions: allEnvOptions.filter(
                            (x) => !allIds.includes(x.id)
                        ),
                        save: (newModel) => {
                            overrideIndex.setEntityObject(newModel)
                            OverrideModal.close()
                        }
                    })
                },
                can: () => apiEnvIndex.length > overrideIndex.length
            }
        },
        {
            action: "delete",
            op: {
                exec: (selected, setSelected) => {
                    overrideIndex.deleteEntities(selected)
                    setSelected([])
                },
                can: (selected) => selected.length > 0
            }
        }
    ]
    const itemActions = [
        {
            icon: "edit",
            action: (index) => {
                const model = overrideIndex.getEntityObject(index)
                OverrideModal.open({
                    edit: true,
                    model,
                    envOptions: allEnvOptions.filter(
                        (x) => x.id === model.value || !allIds.includes(x.id)
                    ),
                    save: (newModel) => {
                        overrideIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        OverrideModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => {
                overrideIndex.deleteEntity(index)
            }
        }
    ]

    return (
        <>
            <EntityStack
                entityIndex={overrideIndex}
                actions={actions}
                itemActions={itemActions}
                render={({ value, overrideValue }) => (
                    <div className="stack-v">
                        <div className="opacity-50 text-xs">
                            {value2envName[value] + ":"}
                        </div>
                        <div className="text-sm">{overrideValue}</div>
                    </div>
                )}
            />
            <OverrideModal.content>
                <EnvOverrideForm {...OverrideModal.props} />
            </OverrideModal.content>
        </>
    )
}

function ConstantForm({
    close,
    model,
    apiEnvIndex,
    edit = false,
    value2envName,
    save,
    reserved
}) {
    const overrideIndex = useMemo(
        () => new SimpleMappingIndex(model.envValues ?? {}, "overrideValue"),
        [model.envValues]
    )
    const [name, setName] = useState(model.name)
    const [constValue, setConstValue] = useState(model.constValue)

    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() =>
                save({
                    ...model,
                    name,
                    constValue,
                    envValues: overrideIndex.model
                })
            }
        >
            <FormGrid>
                <InputCells
                    required
                    autoFocus={!edit}
                    name="Name:"
                    value={name}
                    set={setName}
                    isValid={(value) => !reserved.includes(value.toLowerCase())}
                />
                <InputCells
                    name="Value:"
                    autoFocus={edit}
                    value={constValue}
                    set={setConstValue}
                />
                <CustomCells name="Env overrides">
                    <EnvOverrideStack
                        value2envName={value2envName}
                        apiEnvIndex={apiEnvIndex}
                        overrideIndex={overrideIndex}
                    />
                </CustomCells>
            </FormGrid>
        </OkCancelLayout>
    )
}

function ConstantStack({ constantIndex, apiEnvIndex }) {
    useUpdateOnEntityIndexChanges(apiEnvIndex)
    const NewConstModal = useModalWindow()

    const value2envName = {}
    const apiEnvs = apiEnvIndex.getEntityObjects()
    for (const { value, name } of apiEnvs) {
        value2envName[value] = name
    }
    const actions = [
        {
            action: "add",
            name: "New",
            op: {
                exec: () => {
                    const model = {
                        name: "",
                        constValue: "",
                        value: crypto.randomUUID(),
                        envValues: {}
                    }
                    const reserved = extractLcProps(constantIndex, "name")
                    NewConstModal.open({
                        reserved,
                        value2envName,
                        apiEnvIndex,
                        model,
                        save: (newModel) => {
                            constantIndex.setEntityObject(newModel)
                            NewConstModal.close()
                        }
                    })
                }
            }
        },
        {
            action: "delete",
            op: {
                exec: (selected, setSelected) => {
                    constantIndex.deleteEntities(selected)
                    setSelected([])
                },
                can: (selected) => selected.length > 0
            }
        }
    ]
    const itemActions = [
        {
            icon: "edit",
            action: (index) => {
                const model = constantIndex.getEntityObject(index)
                const reserved = extractLcProps(constantIndex, "name", model)
                NewConstModal.open({
                    edit: true,
                    reserved,
                    model,
                    value2envName,
                    apiEnvIndex,
                    save: (newModel) => {
                        constantIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        NewConstModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => {
                constantIndex.deleteEntity(index)
            }
        }
    ]
    return (
        <>
            <EntityStack
                entityIndex={constantIndex}
                emptyMsg="No constants available"
                actions={actions}
                itemActions={itemActions}
                render={({ name, constValue, envValues }) => (
                    <div className="stack-v gap-2">
                        <div className="stack-v">
                            <div className="text-xs opacity-50">{name}:</div>
                            <div className="text-sm">{constValue}</div>
                        </div>
                        {!!envValues && Object.keys(envValues).length > 0 && (
                            <div className="stack-h">
                                <Icon name="subdirectory_arrow_right" />
                                <div className="stack-v gap-2 pl-2">
                                    {Object.entries(envValues).map(
                                        ([value, overrideValue]) => (
                                            <div
                                                key={value}
                                                className="stack-v"
                                            >
                                                <div className="opacity-50 text-xs">
                                                    {value2envName[value]}:
                                                </div>
                                                <div className="text-sm">
                                                    {overrideValue}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            />

            <NewConstModal.content name="New Constant">
                <ConstantForm {...NewConstModal.props} />
            </NewConstModal.content>
        </>
    )
}

function ConstantManagerWindow({ close }) {
    const aContext = useContext(AppContext)

    const apiEnvIndex = new ApiEnvIndex(aContext.apiSettings.apiEnvs)
    return (
        <OkCancelLayout cancel={close} ok={close}>
            <div className="p-4">
                <ConstantStack
                    apiEnvIndex={apiEnvIndex}
                    constantIndex={aContext.constantIndex}
                />
            </div>
        </OkCancelLayout>
    )
}

export { ConstantStack, ConstantIndex, ConstantManagerWindow }
