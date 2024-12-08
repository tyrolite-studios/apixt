import { useContext, useMemo, useState } from "react"
import { MappingIndex, extractLcProps } from "core/entity"
import { AppContext } from "components/context"
import { EntityStack, useUpdateOnEntityIndexChanges } from "components/common"
import { useModalWindow } from "components/modal"
import { OkCancelLayout, Icon } from "components/layout"
import { FormGrid, InputCells, CustomCells } from "components/form"
import { EnvOverrideIndex, EnvOverrideStack } from "./env-override"

class ApiIndex extends MappingIndex {
    constructor(model) {
        super(model, ["name", "url", "envValues"])
    }
}

function ApiForm({
    close,
    model,
    apiEnvIndex,
    edit = false,
    value2envName,
    save,
    reserved
}) {
    const overrideIndex = useMemo(
        () => new EnvOverrideIndex(model.envValues ?? {}),
        [model.envValues]
    )
    const [name, setName] = useState(model.name)
    const [url, setUrl] = useState(model.url)

    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() =>
                save({
                    ...model,
                    name,
                    url,
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
                    name="Url:"
                    autoFocus={edit}
                    value={url}
                    set={setUrl}
                />
                <CustomCells name="Env overrides:">
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

function ApiStack({ apiIndex, apiEnvIndex }) {
    useUpdateOnEntityIndexChanges(apiEnvIndex)
    const NewApiModal = useModalWindow()

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
                    const reserved = extractLcProps(apiIndex, "name")
                    NewApiModal.open({
                        reserved,
                        value2envName,
                        apiEnvIndex,
                        model,
                        save: (newModel) => {
                            apiIndex.setEntityObject(newModel)
                            NewApiModal.close()
                        }
                    })
                }
            }
        },
        {
            action: "delete",
            op: {
                exec: (selected, setSelected) => {
                    apiIndex.deleteEntities(selected)
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
                const model = apiIndex.getEntityObject(index)
                const reserved = extractLcProps(apiIndex, "name", model)
                NewApiModal.open({
                    edit: true,
                    reserved,
                    model,
                    value2envName,
                    apiEnvIndex,
                    save: (newModel) => {
                        apiIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        NewApiModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => {
                apiIndex.deleteEntity(index)
            }
        }
    ]
    return (
        <>
            <EntityStack
                entityIndex={apiIndex}
                actions={actions}
                itemActions={itemActions}
                render={({ name, url, envValues }) => (
                    <div className="stack-v gap-2">
                        <div className="stack-v">
                            <div className="text-xs opacity-50">{name}:</div>
                            <div className="text-sm">{url}</div>
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

            <NewApiModal.content name="New external API">
                <ApiForm {...NewApiModal.props} />
            </NewApiModal.content>
        </>
    )
}

function ApiManagerWindow({ close }) {
    const aContext = useContext(AppContext)

    return (
        <OkCancelLayout cancel={close} ok={close}>
            <div className="p-4">
                <ApiStack
                    apiIndex={aContext.apiIndex}
                    apiEnvIndex={aContext.apiEnvIndex}
                />
            </div>
        </OkCancelLayout>
    )
}

export { ApiIndex, ApiStack, ApiManagerWindow }
