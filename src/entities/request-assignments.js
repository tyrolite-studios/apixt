import { useMemo, useState, useContext } from "react"
import { MappingIndex, extractLcProps } from "core/entity"
import { EntityStack } from "components/common"
import { OkCancelLayout } from "components/layout"
import { useModalWindow } from "components/modal"
import {
    InputCells,
    CustomCells,
    Select,
    ButtonGroup,
    FormGrid
} from "components/form"
import {
    QueryAssignmentIndex,
    HeadersAssignmentIndex,
    BodyAssignmentIndex,
    AssignmentStack
} from "entities/assignments"
import { AppContext } from "components/context"
import { d } from "core/helper"

const REQUEST_DEFAULTS = {
    OPTION: {
        NONE: "0"
    }
}

class RequestAssignmentsIndex extends MappingIndex {
    constructor(model) {
        super(model, ["name", "query", "headers", "body", "fix"])
    }
}

function RequestAssignmentsForm({ model, save, edit, reserved, close }) {
    const [name, setName] = useState(model.name)
    const queryAssignmentsIndex = useMemo(() => {
        return new QueryAssignmentIndex(model.query)
    }, [])
    const headersAssignmentsIndex = useMemo(() => {
        return new HeadersAssignmentIndex(model.headers)
    }, [])
    const bodyAssignmentsIndex = useMemo(() => {
        return new BodyAssignmentIndex(model.body)
    }, [])
    return (
        <OkCancelLayout
            ok={() =>
                save({
                    name,
                    query: queryAssignmentsIndex.model,
                    headers: headersAssignmentsIndex.model,
                    body: bodyAssignmentsIndex.model
                })
            }
            cancel={() => close()}
        >
            <FormGrid>
                <InputCells
                    name="Name:"
                    isValid={(value) => !reserved.includes(value.toLowerCase())}
                    autoFocus
                    value={name}
                    set={setName}
                />
                <CustomCells name="Query:">
                    <AssignmentStack assignmentIndex={queryAssignmentsIndex} />
                </CustomCells>
                <CustomCells name="Headers:">
                    <AssignmentStack
                        assignmentIndex={headersAssignmentsIndex}
                    />
                </CustomCells>
                <CustomCells name="Body:">
                    <AssignmentStack assignmentIndex={bodyAssignmentsIndex} />
                </CustomCells>
            </FormGrid>
        </OkCancelLayout>
    )
}

function useEditRequestAssignment(requestAssignmentsIndex) {
    const FormModal = useModalWindow()
    const editByModel = (model) => {
        FormModal.open({
            model,
            edit: true,
            reserved: extractLcProps(requestAssignmentsIndex, "name", model),
            save: (newModel) => {
                requestAssignmentsIndex.setEntityObject(
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
        const model = requestAssignmentsIndex.getEntityObject(index)
        editByModel(model)
    }

    return {
        canEdit: (id) => ![REQUEST_DEFAULTS.OPTION.NONE].includes(id),
        editByValue: (value) => {
            const index = requestAssignmentsIndex.getEntityByPropValue(
                "value",
                value
            )
            return editByIndex(index)
        },
        addNew: () => {
            const model = {
                value: crypto.randomUUID(),
                name: "",
                query: {},
                headers: {},
                body: {},
                fix: false
            }
            FormModal.open({
                model,
                reserved: extractLcProps(requestAssignmentsIndex, "name"),
                save: (newModel) => {
                    requestAssignmentsIndex.setEntityObject({
                        ...model,
                        ...newModel
                    })
                    FormModal.close()
                }
            })
        },
        editByIndex,
        editByModel,
        RequestAssignmentsFormModal: (
            <FormModal.content>
                <RequestAssignmentsForm {...FormModal.props} />
            </FormModal.content>
        )
    }
}

function RequestAssignmentsStack({ requestAssignmentsIndex }) {
    const { RequestAssignmentsFormModal, addNew, editByIndex } =
        useEditRequestAssignment(requestAssignmentsIndex)
    const actions = [
        {
            name: "Add",
            icon: "add",
            op: {
                exec: addNew
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
                requestAssignmentsIndex.deleteEntity(index)
            }
        }
    ]

    return (
        <>
            <EntityStack
                entityIndex={requestAssignmentsIndex}
                actions={actions}
                itemActions={itemActions}
            />

            {RequestAssignmentsFormModal}
        </>
    )
}

function RequestManager({ requestAssignmentsIndex, close }) {
    const aContext = useContext(AppContext)
    const [preselectedDefaults, setPreselectedDefaults] = useState(
        aContext.apiSettings.preselectedDefaults
    )
    const options = useMemo(() => {
        return [
            { id: REQUEST_DEFAULTS.OPTION.NONE, name: "None" },
            ...requestAssignmentsIndex
                .getEntityObjects()
                .map(({ value, name }) => ({ id: value, name }))
        ]
    }, [requestAssignmentsIndex.lastModified])

    const save = () => {
        aContext.setApiSetting("preselectedDefaults", preselectedDefaults)
        close()
    }
    return (
        <OkCancelLayout submit ok={save} cancel={() => close()}>
            <div className="p-4">
                <div className="stack-v gap-2">
                    <div className="stack-h gap-2">
                        <div className="text-xs">Preselect:</div>
                        <Select
                            options={options}
                            value={preselectedDefaults}
                            set={setPreselectedDefaults}
                        />
                    </div>
                    <RequestAssignmentsStack
                        requestAssignmentsIndex={requestAssignmentsIndex}
                    />
                </div>
            </div>
        </OkCancelLayout>
    )
}

function RequestAssingmentsPickerCells({
    name,
    value,
    set,
    visibility,
    setVisibility,
    requestAssignmentsIndex
}) {
    const RequestManagerModal = useModalWindow()
    const { editByValue, canEdit, RequestAssignmentsFormModal } =
        useEditRequestAssignment(requestAssignmentsIndex)

    const options = useMemo(() => {
        return [
            { id: REQUEST_DEFAULTS.OPTION.NONE, name: "None" },
            ...requestAssignmentsIndex
                .getEntityObjects()
                .map(({ value, name }) => ({ id: value, name }))
        ]
    }, [requestAssignmentsIndex.lastModified])

    const buttons = [
        {
            icon: "edit",
            disabled: !canEdit(value),
            onPressed: () => editByValue(value)
        },
        {
            icon: "build",
            onPressed: () => {
                RequestManagerModal.open({
                    requestAssignmentsIndex
                })
            }
        },
        {
            icon: "visibility" + (visibility ? "_off" : ""),
            onPressed: () => {
                setVisibility(!visibility)
            }
        }
    ]

    return (
        <CustomCells name={name}>
            <>
                <div className="stack-h gap-2">
                    <Select options={options} value={value} set={set} />
                    <ButtonGroup buttons={buttons} />
                </div>

                {RequestAssignmentsFormModal}

                <RequestManagerModal.content>
                    <RequestManager {...RequestManagerModal.props} />
                </RequestManagerModal.content>
            </>
        </CustomCells>
    )
}

export {
    REQUEST_DEFAULTS,
    RequestAssignmentsIndex,
    RequestAssignmentsStack,
    RequestAssingmentsPickerCells
}
