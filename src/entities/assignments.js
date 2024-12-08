import { useMemo, useState, useContext } from "react"
import { useModalWindow } from "components/modal"
import { AppContext } from "components/context"
import { d, isObject, without } from "core/helper"
import { OkCancelLayout } from "components/layout"
import { EntityStack, useUpdateOnEntityIndexChanges } from "components/common"
import { FormGrid } from "components/form"
import { isMethodWithRequestBody } from "core/http"
import {
    CustomCells,
    InputCells,
    SelectCells,
    Select,
    Button
} from "components/form"
import { ClassNames } from "core/helper"
import { Icon } from "../components/layout"
import { ConstantManagerWindow } from "entities/constants"
import { MappingIndex } from "core/entity"

class AssignmentIndex extends MappingIndex {
    constructor(model) {
        super(model, ["type", "assignmentValue"])
    }
}

function getNonDefaultAssignments(assignments, mode) {
    if (!assignments || mode === 0) return []

    const result = []
    for (const [name, assignment] of Object.entries(assignments)) {
        const { type, assignmentValue } = assignment

        if (mode === 1 && type === "default") continue

        result.push({ name, type, value: assignmentValue })
    }
    return result
}

function getAllNonDefaultAssignments(assignments, mode) {
    return {
        headers: getNonDefaultAssignments(assignments.headers, mode),
        query: getNonDefaultAssignments(assignments.query, mode),
        body: getNonDefaultAssignments(assignments.body, mode)
    }
}

function AssignmentBox({
    type,
    name,
    value,
    defaulted = false,
    className,
    env,
    vertical = false
}) {
    const aContext = useContext(AppContext)
    useUpdateOnEntityIndexChanges(aContext.constantIndex)

    const boxName = ["const", "prompt"].includes(type) ? type : undefined
    const cls = ClassNames("", className)
    cls.addIf(vertical, "stack-v", "stack-h")

    const resolved =
        type === "const" ? aContext.getConstName(value, env) : value

    const boxCls = ClassNames("px-1 text-xs")
    boxCls.addIf(
        resolved === undefined,
        "text-warning-bg bg-warning-text/50",
        "text-input-bg bg-input-text/50"
    )
    const right = boxName ? (
        <div className="stack-h">
            <div className={boxCls.value}>{boxName}</div>
            <div className="px-1">
                {resolved === undefined ? (
                    <span className="opacity-50">{"<invalid>"}</span>
                ) : (
                    resolved
                )}
            </div>
        </div>
    ) : (
        <div>{type === "ignore" ? <Icon name="block" /> : resolved}</div>
    )
    return (
        <div className={cls.value}>
            {name && (
                <div className="opacity-50 stack-h pr-2">
                    <div>{name}:</div>
                </div>
            )}
            <div className="stack-h gap-1">
                {(defaulted || type === "ignore") && (
                    <Icon name="subdirectory_arrow_right" />
                )}
                {right}
            </div>
        </div>
    )
}

function AssignmentsInfo({ entity, assignments }) {
    if (!assignments || !assignments.length) return
    return (
        <div className="stack-h flex-wrap gap-y-1">
            <div className="text-xs">{entity}:</div>
            {assignments.map(({ name, type, value }) => (
                <AssignmentBox
                    key={name}
                    className="text-xs pl-2"
                    name={name}
                    value={value}
                    type={type}
                    defaulted={type === "default"}
                />
            ))}
        </div>
    )
}

function getAssignmentFor(key, assignments, object = {}) {
    for (const [assignmentKey, assignment] of Object.entries(assignments)) {
        if (key !== assignmentKey.toLowerCase()) continue

        return assignment.type === "set" ? assignment.value : undefined
    }
    const value = object[key]

    return value
}

function RenderWithAssignments({
    children,
    request,
    method,
    bodyType,
    mode,
    assignments = {}
}) {
    const { headers, query, body } = getAllNonDefaultAssignments(
        assignments,
        mode
    )
    const basicBody = []
    let rawBody = null
    let invalidBody = false
    if (isMethodWithRequestBody(method) && request.body) {
        if (bodyType && bodyType.endsWith("json")) {
            try {
                const parsed = JSON.parse(request.body)
                if (isObject(parsed)) {
                    for (const [name, value] of Object.entries(parsed)) {
                        basicBody.push({ type: "set", name, value })
                    }
                } else {
                    rawBody = request.body
                }
            } catch (e) {
                rawBody = request.body
                invalidBody = true
            }
        } else {
            rawBody = request.body
        }
    }
    const elems = []
    elems.push(children)
    if (headers.length || query.length || body.length) {
        elems.push(
            <div key="i2" className="stack-v gap-2 p-1">
                <AssignmentsInfo
                    mode={mode}
                    entity="Query"
                    assignments={query}
                />
                <AssignmentsInfo
                    mode={mode}
                    entity="Headers"
                    assignments={headers}
                />
                {isMethodWithRequestBody(method) && !!rawBody && (
                    <div className="stack-h gap-2 text-xs">
                        <div className="truncate">Body:</div>
                        {invalidBody && (
                            <div className="px-1 text-warning-bg bg-warning-text/50">
                                Invalid
                            </div>
                        )}
                        <div className="opacity-50">{rawBody}</div>
                    </div>
                )}
                {isMethodWithRequestBody(method) && !rawBody && (
                    <AssignmentsInfo
                        mode={mode}
                        entity="Body"
                        assignments={[...basicBody, ...body]}
                    />
                )}
            </div>
        )
    }

    return (
        <div className="stack-v gap-2 divide-y divide-dashed divide-header-text/50">
            {elems}
        </div>
    )
}

function AssignmentEditForm({
    model,
    close,
    store,
    defaultsModel,
    edit,
    reserved = []
}) {
    const aContext = useContext(AppContext)
    const ConstantModal = useModalWindow()

    const isDefaultable = useMemo(() => {
        return !!(defaultsModel && defaultsModel[model.value])
    }, [])
    const typeOptions = useMemo(() => {
        const types = []
        if (isDefaultable)
            types.push(
                { id: "default", name: "Default" },
                { id: "ignore", name: "Block default" }
            )
        types.push(
            { id: "set", name: "Set" },
            { id: "const", name: "Constant" },
            { id: "prompt", name: "Prompt" },
            { id: "extract", name: "Extract from Request" }
        )
        return types
    })
    const constantOptions = aContext.getConstOptions()
    const requestsOptions = aContext.getRequestOptions()

    const [value, setValue] = useState(model.value)
    const [type, setType] = useState(model.type)
    const [assignmentValue, setAssignmentValue] = useState(
        model.assignmentValue
    )
    const blocked = type === "ignore"
    return (
        <OkCancelLayout
            ok={() => {
                store({ value, type, assignmentValue })
            }}
            cancel={() => close()}
            submit
        >
            <FormGrid>
                {isDefaultable && (
                    <CustomCells name="Name">
                        <div>{value}</div>
                    </CustomCells>
                )}
                {!isDefaultable && (
                    <InputCells
                        name="Name"
                        value={value}
                        set={setValue}
                        readOnly={isDefaultable}
                        isValid={(currValue) =>
                            !reserved.includes(currValue.toLowerCase())
                        }
                        autoFocus={!isDefaultable && !edit}
                        required
                    />
                )}
                <SelectCells
                    name="Type"
                    value={type}
                    set={setType}
                    options={typeOptions}
                />
                {!["ignore", "default", "const", "extract"].includes(type) && (
                    <InputCells
                        name={type === "prompt" ? "Question" : "Value"}
                        value={assignmentValue}
                        set={setAssignmentValue}
                        required
                        autoFocus={edit}
                    />
                )}
                {type === "const" && (
                    <CustomCells name="Constant">
                        <div className="stack-h gap-2">
                            <Select
                                required
                                options={constantOptions}
                                value={assignmentValue}
                                set={setAssignmentValue}
                            />
                            <Button
                                icon="build"
                                onPressed={() => ConstantModal.open()}
                            />
                        </div>
                    </CustomCells>
                )}
                {type === "extract" && (
                    <CustomCells name="Extract">
                        <div className="stack-h gap-2">
                            <Select
                                required
                                options={requestsOptions}
                                value={assignmentValue}
                                set={setAssignmentValue}
                            />
                        </div>
                    </CustomCells>
                )}
                {["default", "ignore"].includes(type) && (
                    <CustomCells name="Value">
                        <AssignmentBox
                            className="border text-sm p-2 bg-input-bg border-input-border text-input-text"
                            defaulted={true}
                            value={
                                blocked
                                    ? undefined
                                    : defaultsModel[value].assignmentValue
                            }
                            type={blocked ? type : defaultsModel[value].type}
                        />
                    </CustomCells>
                )}
            </FormGrid>

            <ConstantModal.content>
                <ConstantManagerWindow {...ConstantModal.props} />
            </ConstantModal.content>
        </OkCancelLayout>
    )
}

function AssignmentStack({ assignmentIndex, defaultsModel, mode }) {
    const EditModal = useModalWindow()

    const allValues = assignmentIndex
        .getPropValues("value")
        .map((x) => x.toLowerCase())

    const actions = [
        {
            icon: "add",
            name: "New",
            op: {
                exec: () => {
                    EditModal.open({
                        defaultsModel,
                        model: {
                            name: "",
                            type: "set",
                            assignmentValue: ""
                        },
                        reserved: allValues,
                        store: (newModel) => {
                            assignmentIndex.setEntityObject(newModel)
                            EditModal.close()
                        }
                    })
                }
            }
        }
    ]

    const itemActions = [
        {
            icon: "edit",
            action: (index) => {
                const model = assignmentIndex.getEntityObject(index)
                EditModal.open({
                    defaultsModel,
                    model,
                    edit: true,
                    reserved: without(allValues, model.value.toLowerCase()),
                    store: (newModel) => {
                        assignmentIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        EditModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => {
                const value = assignmentIndex.getEntityValue(index)
                const isDefaultable = !!(defaultsModel && defaultsModel[value])
                if (isDefaultable) {
                    assignmentIndex.setEntityPropValue(index, "type", "ignore")
                    assignmentIndex.setEntityPropValue(
                        index,
                        "assignmentValue",
                        ""
                    )
                } else {
                    assignmentIndex.deleteEntity(index)
                }
            }
        }
    ]
    return (
        <>
            <EntityStack
                entityIndex={assignmentIndex}
                actions={actions}
                itemActions={itemActions}
                render={(item) => {
                    const defaultAssignment =
                        item.type === "default" &&
                        defaultsModel &&
                        defaultsModel[item.value]
                    return (
                        <AssignmentBox
                            className="text-sm"
                            vertical
                            defaulted={!!defaultAssignment}
                            name={item.value}
                            value={
                                defaultAssignment
                                    ? defaultAssignment.assignmentValue
                                    : item.assignmentValue
                            }
                            type={
                                defaultAssignment
                                    ? defaultAssignment.type
                                    : item.type
                            }
                        />
                    )
                }}
            />

            <EditModal.content>
                <AssignmentEditForm {...EditModal.props} />
            </EditModal.content>
        </>
    )
}

export { RenderWithAssignments, AssignmentStack, AssignmentIndex }
