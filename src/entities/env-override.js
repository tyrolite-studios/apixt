import { useState, useMemo } from "react"
import { FormGrid, InputCells, SelectCells } from "components/form"
import { EntityStack } from "components/common"
import { OkCancelLayout } from "components/layout"
import { useModalWindow } from "components/modal"
import { SimpleMappingIndex } from "core/entity"

class EnvOverrideIndex extends SimpleMappingIndex {
    constructor(model) {
        super(model, "overrideValue")
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

export { EnvOverrideIndex, EnvOverrideStack }
