import { useContext, useMemo, useState } from "react"
import { MappingIndex, extractLcProps } from "core/entity"
import { AppContext } from "components/context"
import { EntityStack, useUpdateOnEntityIndexChanges } from "components/common"
import { useModalWindow } from "components/modal"
import { OkCancelLayout, Icon } from "components/layout"
import {
    FormGrid,
    InputCells,
    CustomCells,
    Select,
    ButtonGroup
} from "components/form"
import { EnvOverrideIndex, EnvOverrideStack } from "./env-override"

const APIS = {
    OPTION: {
        CURRENT: "0"
    }
}

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

function useApiForm(apiIndex, apiEnvIndex) {
    const FormModal = useModalWindow()
    const value2envName = {}
    const apiEnvs = apiEnvIndex.getEntityObjects()
    for (const { value, name } of apiEnvs) {
        value2envName[value] = name
    }

    const editByModel = (model) => {
        FormModal.open({
            model,
            edit: true,
            reserved: extractLcProps(apiIndex, "name", model),
            value2envName,
            apiEnvIndex,
            save: (newModel) => {
                apiIndex.setEntityObject(
                    {
                        ...model,
                        ...newModel
                    },
                    true
                )
                FormModal.close()
            }
        })
    }
    const editByIndex = (index) => {
        const model = apiIndex.getEntityObject(index)
        editByModel(model)
    }
    return {
        canEdit: (id) => ![APIS.OPTION.CURRENT].includes(id),
        editByValue: (value) => {
            const index = apiIndex.getEntityByPropValue("value", value)
            return editByIndex(index)
        },
        addNew: () => {
            const model = {
                name: "",
                url: "",
                value: crypto.randomUUID(),
                envValues: {}
            }
            const reserved = extractLcProps(apiIndex, "name")
            FormModal.open({
                reserved,
                value2envName,
                apiEnvIndex,
                model,
                save: (newModel) => {
                    apiIndex.setEntityObject(newModel)
                    FormModal.close()
                }
            })
        },
        value2envName,
        editByIndex,
        editByModel,
        ApiFormModal: (
            <FormModal.content>
                <ApiForm {...FormModal.props} />
            </FormModal.content>
        )
    }
}

function ApiStack({ apiIndex, apiEnvIndex }) {
    useUpdateOnEntityIndexChanges(apiEnvIndex)
    const { ApiFormModal, addNew, editByIndex, value2envName } = useApiForm(
        apiIndex,
        apiEnvIndex
    )

    const actions = [
        {
            action: "add",
            name: "New",
            op: {
                exec: addNew
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
            action: editByIndex
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

            {ApiFormModal}
        </>
    )
}

function ApiManager({ close }) {
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

function ApiSelect({ api, setApi, apiIndex, apiEnvIndex }) {
    const aContext = useContext(AppContext)
    const ApiManagerModal = useModalWindow()
    const { ApiFormModal, editByValue, canEdit } = useApiForm(
        apiIndex,
        apiEnvIndex
    )
    const buttons = [
        {
            icon: "edit",
            disabled: !canEdit(api),
            onPressed: () => editByValue(api)
        },
        {
            icon: "build",
            onPressed: () => {
                ApiManagerModal.open({
                    apiIndex
                })
            }
        }
    ]
    return (
        <>
            <div className="stack-h gap-2 items-center">
                <div className="text-xs">API:</div>
                <Select
                    options={aContext.getApiOptions()}
                    value={api}
                    set={setApi}
                />
                <ButtonGroup buttons={buttons} />
            </div>

            {ApiFormModal}

            <ApiManagerModal.content>
                <ApiManager {...ApiManagerModal.props} />
            </ApiManagerModal.content>
        </>
    )
}

export { ApiIndex, ApiStack, ApiManager, ApiSelect, APIS }
