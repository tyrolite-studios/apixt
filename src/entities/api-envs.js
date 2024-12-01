import { MappingIndex, extractLcProps } from "core/entity"
import { useState } from "react"
import { FormGrid, InputCells, CheckboxCells } from "components/form"
import { EntityStack } from "components/common"
import { Stack, OkCancelLayout } from "components/layout"
import { d } from "core/helper"
import { useModalWindow } from "components/modal"

class ApiEnvIndex extends MappingIndex {
    constructor(model) {
        super(model, ["url", "name", "cors", "envVars"])
    }
}

function NewApiEnv({ close, model, save, reserved = [] }) {
    const [name, setName] = useState(model.name)
    const [url, setUrl] = useState(model.url)
    const [cors, setCors] = useState(model.cors ?? true)
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
                    isValid={(value) => !reserved.includes(value.toLowerCase())}
                    autoFocus
                    required
                />
                <InputCells name="URL:" value={url} set={setUrl} required />
                <CheckboxCells name="CORS:" value={cors} set={setCors} />
            </FormGrid>
        </OkCancelLayout>
    )
}

function ApiEnvStack({ entityIndex, constantIndex }) {
    const NewEnvModal = useModalWindow()

    const actions = [
        {
            action: "add",
            name: "New",
            op: {
                exec: () => {
                    const model = {
                        value: crypto.randomUUID(),
                        name: "",
                        cors: true,
                        url: ""
                    }
                    const reserved = extractLcProps(entityIndex, "name")
                    NewEnvModal.open({
                        model,
                        reserved,
                        save: (newModel) => {
                            entityIndex.setEntityObject({
                                ...model,
                                ...newModel
                            })
                            NewEnvModal.close()
                        }
                    })
                }
            }
        },
        {
            action: "edit",
            op: {
                exec: (selected) => {
                    const index = selected[0]
                    const model = entityIndex.getEntityObject(index)
                    const reserved = extractLcProps(entityIndex, "name", model)
                    NewEnvModal.open({
                        edit: true,
                        model,
                        reserved,
                        save: (newModel) => {
                            entityIndex.setEntityObject(
                                {
                                    ...model,
                                    ...newModel
                                },
                                true
                            )
                            NewEnvModal.close()
                        }
                    })
                },
                can: (selected) => selected.length === 1
            }
        },
        {
            action: "delete",
            op: {
                exec: (selected, setSelected) => {
                    entityIndex.deleteEntities(selected)
                    setSelected([])
                    const constants = constantIndex.getEntityObjects()
                    const ids = entityIndex.getPropValues("value")
                    const updates = []
                    for (const obj of constants) {
                        let changed = false
                        const newEnv = {}
                        for (const [envId, value] of Object.entries(
                            obj.envValues
                        )) {
                            if (!ids.includes(envId)) {
                                changed = true
                                continue
                            }
                            newEnv[envId] = value
                        }
                        if (changed) {
                            updates.push({ ...obj, envValues: newEnv })
                        }
                    }
                    for (const obj of updates) {
                        constantIndex.setEntityObject(obj, true)
                    }
                },
                can: (selected) => selected.length > 0
            }
        }
    ]
    const itemActions = [
        {
            icon: "edit",
            action: (index) => {
                const model = entityIndex.getEntityObject(index)
                const reserved = extractLcProps(entityIndex, "name", model)
                NewEnvModal.open({
                    edit: true,
                    model,
                    reserved,
                    save: (newModel) => {
                        entityIndex.setEntityObject(
                            {
                                ...model,
                                ...newModel
                            },
                            true
                        )
                        NewEnvModal.close()
                    }
                })
            }
        }
    ]

    return (
        <>
            <EntityStack
                emptyMsg={
                    "No API environments available. Add one by clicking on the new button above"
                }
                entityIndex={entityIndex}
                render={({ name, url }) => (
                    <Stack vertical key={name} className="">
                        <div className="text-sm">{name}</div>
                        <div className="text-app-text text-xs">
                            URL: <span className="text-app-text/50">{url}</span>
                        </div>
                    </Stack>
                )}
                actions={actions}
                itemActions={itemActions}
            />

            <NewEnvModal.content name="New API environment">
                <NewApiEnv {...NewEnvModal.props} />
            </NewEnvModal.content>
        </>
    )
}

export { ApiEnvIndex, ApiEnvStack }
