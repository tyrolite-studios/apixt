import { useMemo, useState, useContext } from "react"
import { useModalWindow } from "components/modal"
import { AppContext } from "components/context"
import {
    d,
    ClassNames,
    isObject,
    isArray,
    isString,
    without,
    getParsedJson
} from "core/helper"
import { OkCancelLayout, Icon } from "components/layout"
import {
    EntityStack,
    useUpdateOnEntityIndexChanges,
    BodyTextarea,
    JsonPathInput
} from "components/common"
import { FormGrid } from "components/form"
import {
    isMethodWithRequestBody,
    startAbortableApiBodyRequest
} from "core/http"
import {
    CustomCells,
    InputCells,
    SelectCells,
    NumberCells,
    RadioCells,
    Select,
    Button
} from "components/form"
import { ConstantManagerWindow } from "entities/constants"
import { MappingIndex, extractLcProps } from "core/entity"
import { isBool, isNumber } from "../core/helper"

const ASSIGNMENT = {
    ACTION: {
        SET: 1,
        DEFAULT: 2,
        IGNORE: 3,
        CONST: 4,
        PROMPT: 5,
        EXTRACT: 6
    },
    TYPE: {
        STRING: 1,
        JSON: 2
    }
}

const action2boxName = {
    [ASSIGNMENT.ACTION.PROMPT]: "Prompt",
    [ASSIGNMENT.ACTION.CONST]: "Const",
    [ASSIGNMENT.ACTION.EXTRACT]: "Request"
}

class AssignmentIndex extends MappingIndex {
    constructor(model, types = [ASSIGNMENT.TYPE.STRING]) {
        super(model, ["action", "type", "assignmentValue"])
        this.types = types
    }

    hasMultiType() {
        return this.types.length > 1
    }

    syncToDefaults(defaults) {
        const lcKey2defaultKey = {}
        const defaultKeys = []
        for (const key of defaults ? Object.keys(defaults) : []) {
            const lcKey = key.toLowerCase()
            defaultKeys.push(lcKey)
            lcKey2defaultKey[lcKey] = key
        }
        const indices = []
        let i = 0
        while (i < this.length) {
            const lcKey = this.getEntityPropValue(i, "value").toLowerCase()
            const hasDefault = defaultKeys.includes(lcKey)
            if (hasDefault) {
                this.setEntityPropValue(i, "value", lcKey2defaultKey[lcKey])
            }
            switch (this.getEntityPropValue(i, "action")) {
                case ASSIGNMENT.ACTION.IGNORE:
                    if (hasDefault) break

                case ASSIGNMENT.ACTION.DEFAULT:
                    indices.push(i)
                    break
            }
            i++
        }
        this.deleteEntities(indices)
        if (!defaults) return

        const lcKeys = extractLcProps(this, "value")
        const add = []
        for (const key of Object.keys(defaults)) {
            if (lcKeys.includes(key.toLowerCase())) continue

            add.push({
                value: key,
                action: ASSIGNMENT.ACTION.DEFAULT,
                type: ASSIGNMENT.TYPE.STRING,
                assignmentValue: ""
            })
        }
        this.setEntityObjects(add)
    }
}

function getQueryNormalized(json) {
    if (undefined) return

    if (isString(json)) return json

    if (isArray(json)) {
        const normalized = []
        for (const elem of json) {
            const normElem = getQueryNormalized(elem)
            if (normElem !== undefined) normalized.push(normElem)
        }
        return normalized.length === 0 ? [""] : normalized
    }

    if (isObject(json)) {
        const normalized = {}
        let no = 0
        for (const [key, value] of Object.entries(json)) {
            const normValue = getQueryNormalized(value)
            if (normValue !== undefined) {
                no++
                normalized[key] = normValue
            }
        }
        return no === 0 ? undefined : normalized
    }
    if (isNumber(json)) {
        return "" + json
    }
    if (isBool(json)) {
        return json ? "true" : "false"
    }
    return
}

class QueryAssignmentIndex extends AssignmentIndex {
    constructor(model) {
        super(model, [ASSIGNMENT.TYPE.STRING, ASSIGNMENT.TYPE.JSON])
        this.validator = (value) => {
            if (value === "") return true

            const parsed = getParsedJson(value)
            if (parsed === undefined) return false

            return (
                isString(parsed) ||
                isArray(parsed) ||
                isObject(parsed) ||
                isBool(parsed) ||
                isNumber(parsed)
            )
        }
        this.normalize = (value) => getQueryNormalized(value)
    }
}

class HeadersAssignmentIndex extends AssignmentIndex {}

class BodyAssignmentIndex extends AssignmentIndex {
    constructor(model) {
        super(model, [ASSIGNMENT.TYPE.STRING, ASSIGNMENT.TYPE.JSON])
    }
}

function extractContentTypeFromAssignments(assignments) {
    if (!assignments) return

    let contentType = undefined
    for (const [name, assignment] of Object.entries(assignments)) {
        if (name.toLocaleLowerCase() !== "content-type") continue

        const { action, assignmentValue } = assignment
        if (action === ASSIGNMENT.ACTION.SET) {
            contentType = assignmentValue
        } else if (action === ASSIGNMENT.ACTION.DEFAULT) {
            contentType = null
        } else if (action === ASSIGNMENT.ACTION.IGNORE) {
            contentType = "raw"
        }
        break
    }
    return contentType
}

function getNonDefaultAssignments(assignments, mode) {
    if (!assignments || mode === 0) return []

    const result = []
    for (const [name, assignment] of Object.entries(assignments)) {
        const { action, assignmentValue } = assignment

        if (mode === 1 && action === ASSIGNMENT.ACTION.DEFAULT) continue

        result.push({ name, action, value: assignmentValue })
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

function getExtractPathForString(path, source = "") {
    const parts = source ? [source] : []
    const parsed = getParsedJson(path)
    if (isArray(parsed)) {
        parts.push(...parsed.map((x) => (isString(x) ? JSON.stringify(x) : x)))
    }
    return parts.join(" → ")
}

function AssignmentBox({
    action,
    name,
    type,
    value,
    defaulted = false,
    className,
    env,
    vertical = false
}) {
    const aContext = useContext(AppContext)
    useUpdateOnEntityIndexChanges(aContext.constantIndex)

    const boxName = action2boxName[action]
    const cls = ClassNames("", className)
    cls.addIf(vertical, "stack-v", "stack-h")

    let resolved = value
    if (action === ASSIGNMENT.ACTION.CONST) {
        resolved = aContext.getConstName(value, env)
    } else if (action === ASSIGNMENT.ACTION.EXTRACT) {
        const { request, from, path } = getExtractParts(value)
        resolved = `${JSON.stringify(aContext.getRequestName(request))}: ${getExtractPathForString(path, from)}`
    } else if (
        action === ASSIGNMENT.ACTION.SET &&
        type === ASSIGNMENT.TYPE.JSON
    ) {
        resolved = getParsedJson(value)
    }
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
                    <pre>
                        {action === ASSIGNMENT.ACTION.EXTRACT
                            ? resolved
                            : JSON.stringify(
                                  resolved,
                                  null,
                                  aContext.globalSettings.tabWidth
                              )}
                    </pre>
                )}
            </div>
        </div>
    ) : (
        <div>
            {action === ASSIGNMENT.ACTION.IGNORE ? (
                <Icon name="block" />
            ) : (
                <pre>
                    {JSON.stringify(
                        resolved,
                        null,
                        aContext.globalSettings.tabWidth
                    )}
                </pre>
            )}
        </div>
    )
    return (
        <div className={cls.value}>
            {name && (
                <div className="opacity-50 stack-h pr-2">
                    <div>{name}:</div>
                </div>
            )}
            <div className="stack-h gap-1">
                {(defaulted || action === ASSIGNMENT.ACTION.IGNORE) && (
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
            {assignments.map(({ name, action, value }) => (
                <AssignmentBox
                    key={name}
                    className="text-xs pl-2"
                    name={name}
                    value={value}
                    action={action}
                    defaulted={action === ASSIGNMENT.ACTION.DEFAULT}
                />
            ))}
        </div>
    )
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
                        // TODO: type
                        basicBody.push({
                            action: ASSIGNMENT.ACTION.SET,
                            type: ASSIGNMENT.TYPE.STRING,
                            name,
                            value
                        })
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

const assignBodyType = "assign_json"

const makeExtractParts = (request, code, from, path) => {
    return `${request} ${code} ${from} ${path}`
}

const getExtractParts = (value) => {
    let [request = "", code = "200", from = "", path = "[]"] = value.split(
        " ",
        4
    )
    return {
        request,
        code: parseInt(code),
        from,
        path
    }
}

function AssignmentEditForm({
    assignmentIndex,
    model,
    close,
    save,
    defaultsModel,
    edit,
    reserved = []
}) {
    const aContext = useContext(AppContext)
    const ConstantModal = useModalWindow()

    const isDefaultable = useMemo(() => {
        return !!(defaultsModel && defaultsModel[model.value])
    }, [])
    const actionOptions = useMemo(() => {
        const actions = []
        if (isDefaultable)
            actions.push(
                { id: ASSIGNMENT.ACTION.DEFAULT, name: "Default" },
                { id: ASSIGNMENT.ACTION.IGNORE, name: "Block default" }
            )
        actions.push(
            { id: ASSIGNMENT.ACTION.SET, name: "Set" },
            { id: ASSIGNMENT.ACTION.CONST, name: "Constant" },
            { id: ASSIGNMENT.ACTION.PROMPT, name: "Prompt" },
            { id: ASSIGNMENT.ACTION.EXTRACT, name: "Extract from Request" }
        )
        return actions
    })
    const typeOptions = [
        { id: ASSIGNMENT.TYPE.STRING, name: "String" },
        { id: ASSIGNMENT.TYPE.JSON, name: "JSON" }
    ]
    const constantOptions = aContext.getConstOptions()
    const requestsOptions = aContext.getRequestOptions()

    const [value, setValue] = useState(model.value)
    const [mode, setMode] = useState(
        aContext.getLastBodyTypeMode(assignBodyType)
    )
    const [assignmentValue, setAssignmentValue] = useState(() => {
        return model.type === ASSIGNMENT.TYPE.JSON
            ? aContext.getFormatedBody(mode, model.assignmentValue)
            : model.assignmentValue
    })
    const [type, setTypeRaw] = useState(model.type)
    const setType = (newType) => {
        if (newType === ASSIGNMENT.TYPE.JSON) {
            setAssignmentValue(JSON.stringify(assignmentValue))
        } else {
            const resolved = aContext.getResolvedBodyForMode(
                mode,
                assignmentValue
            )
            const parsed = getParsedJson(resolved)
            if (isString(parsed)) {
                setAssignmentValue(parsed)
            } else if (parsed !== undefined) {
                setAssignmentValue(JSON.stringify(parsed))
            }
        }
        setTypeRaw(newType)
    }
    const [action, setActionRaw] = useState(model.action)
    const setAction = (newAction) => {
        setAssignmentValue("")
        setTypeRaw(ASSIGNMENT.TYPE.STRING)
        setExtractRequest("")
        setExtractCode(200)
        setExtractFrom("body")
        setExtractPath("[]")
        setActionRaw(newAction)
    }
    const extractFromOptions = [
        { id: "body", name: "Body" },
        { id: "header", name: "Header" },
        { id: "cookie", name: "Cookie" }
    ]
    const extractDefault = useMemo(() => {
        if (action !== ASSIGNMENT.ACTION.EXTRACT) return {}

        return getExtractParts(model.assignmentValue)
    }, [])
    const [extractRequest, setExtractRequest] = useState(
        extractDefault.request ?? ""
    )
    const [extractCode, setExtractCode] = useState(extractDefault.code ?? 200)
    const [extractFrom, setExtractFrom] = useState(
        extractDefault.from ?? "body"
    )
    const [extractPath, setExtractPath] = useState(extractDefault.path ?? "[]")
    const loadTree = useMemo(() => {
        if (action !== ASSIGNMENT.ACTION.EXTRACT || !extractRequest) return

        const idx = aContext.requestIndex.getEntityByPropValue(
            "value",
            extractRequest
        )
        if (idx === undefined) return

        const { request, assignments } =
            aContext.requestIndex.getEntityObject(idx)
        return () =>
            aContext
                .fetchApiResponse(request, d(assignments))
                .fetchPromise.then((result) => {
                    if (extractFrom === "body")
                        return getParsedJson(result.body)
                    if (extractFrom === "header") return result.headers
                })
    }, [extractFrom, extractRequest, extractCode])

    const blocked = action === ASSIGNMENT.ACTION.IGNORE
    return (
        <OkCancelLayout
            ok={() => {
                let assignValue = assignmentValue
                let assignType = type
                if (
                    action === ASSIGNMENT.ACTION.SET &&
                    type === ASSIGNMENT.TYPE.JSON
                ) {
                    const resolved = aContext.getResolvedBodyForMode(
                        mode,
                        assignmentValue
                    )
                    assignValue = getParsedJson(resolved)
                    if (
                        assignValue !== undefined &&
                        assignmentIndex.normalize
                    ) {
                        assignValue = assignmentIndex.normalize(assignValue)
                    }
                    if (isString(parsed)) {
                        assignType = ASSIGNMENT.TYPE.STRING
                    } else if (parsed !== undefined) {
                        assignValue = JSON.stringify(assignValue)
                    } else {
                        assignType = ASSIGNMENT.TYPE.STRING
                        assignValue = ""
                    }
                }
                if (action === ASSIGNMENT.ACTION.EXTRACT) {
                    assignValue = makeExtractParts(
                        extractRequest,
                        extractCode,
                        extractFrom,
                        extractPath
                    )
                }
                save({
                    value,
                    action,
                    type: assignType,
                    assignmentValue: assignValue
                })
            }}
            cancel={() => close()}
            submit
        >
            <FormGrid>
                {isDefaultable && (
                    <CustomCells name="Name:">
                        <div className="text-sm">{value}</div>
                    </CustomCells>
                )}
                {!isDefaultable && (
                    <InputCells
                        name="Name:"
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
                    name="Action:"
                    value={action}
                    set={setAction}
                    options={actionOptions}
                />
                {assignmentIndex.hasMultiType() &&
                    action === ASSIGNMENT.ACTION.SET && (
                        <RadioCells
                            name="Type:"
                            value={type}
                            set={setType}
                            options={typeOptions}
                        />
                    )}
                {![
                    ASSIGNMENT.ACTION.IGNORE,
                    ASSIGNMENT.ACTION.DEFAULT,
                    ASSIGNMENT.ACTION.CONST,
                    ASSIGNMENT.ACTION.EXTRACT
                ].includes(action) &&
                    (type === ASSIGNMENT.TYPE.STRING ? (
                        <InputCells
                            name={
                                action === ASSIGNMENT.ACTION.PROMPT
                                    ? "Question:"
                                    : "Value:"
                            }
                            value={assignmentValue}
                            set={setAssignmentValue}
                            autoFocus={edit}
                        />
                    ) : (
                        <CustomCells
                            name={
                                action === ASSIGNMENT.ACTION.PROMPT
                                    ? "Question:"
                                    : "Value:"
                            }
                        >
                            <BodyTextarea
                                type={assignBodyType}
                                value={assignmentValue}
                                set={setAssignmentValue}
                                reverse
                                rows={10}
                                mode={mode}
                                setMode={setMode}
                                markInvalid
                                validator={assignmentIndex.validator}
                                required
                                autoFocus={edit}
                            />
                        </CustomCells>
                    ))}
                {action === ASSIGNMENT.ACTION.CONST && (
                    <CustomCells name="Constant:">
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
                {action === ASSIGNMENT.ACTION.EXTRACT && (
                    <>
                        <SelectCells
                            name="Request:"
                            required
                            options={requestsOptions}
                            value={extractRequest}
                            set={setExtractRequest}
                        />
                        <NumberCells
                            name="Http code:"
                            required
                            min={100}
                            max={599}
                            value={extractCode}
                            set={setExtractCode}
                        />
                        <RadioCells
                            name="From:"
                            options={extractFromOptions}
                            value={extractFrom}
                            set={setExtractFrom}
                        />
                        <CustomCells name="Property:">
                            <JsonPathInput
                                root={extractFrom}
                                loadTree={loadTree}
                                disabled={!extractRequest}
                                path={extractPath}
                                setPath={setExtractPath}
                            />
                        </CustomCells>
                    </>
                )}
                {[ASSIGNMENT.ACTION.DEFAULT, ASSIGNMENT.ACTION.IGNORE].includes(
                    action
                ) && (
                    <CustomCells name="Value:">
                        <AssignmentBox
                            className="border text-sm p-2 bg-input-bg border-input-border text-input-text"
                            defaulted={true}
                            value={
                                blocked
                                    ? undefined
                                    : defaultsModel[value].assignmentValue
                            }
                            action={
                                blocked ? action : defaultsModel[value].action
                            }
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

function AssignmentStack({ assignmentIndex, defaultsModel = {}, matcher }) {
    const EditModal = useModalWindow()
    const defaultLcKeys = Object.keys(defaultsModel).map((x) => x.toLowerCase())
    const lc2default = {}
    for (const key of Object.keys(defaultsModel)) {
        lc2default[key.toLowerCase()] = key
    }
    const checkDefaults = !!matcher

    const actions = [
        {
            icon: "add",
            name: "Add",
            op: {
                exec: () => {
                    const allLcKeys = extractLcProps(assignmentIndex, "value")
                    EditModal.open({
                        assignmentIndex,
                        defaultsModel,
                        model: {
                            name: "",
                            type: ASSIGNMENT.TYPE.STRING,
                            action: ASSIGNMENT.ACTION.SET,
                            assignmentValue: ""
                        },
                        reserved: checkDefaults
                            ? without(allLcKeys, defaultLcKeys)
                            : allLcKeys,
                        save: (newModel) => {
                            const lcValue = newModel.value.toLowerCase()
                            if (
                                checkDefaults &&
                                defaultLcKeys.includes(lcValue)
                            ) {
                                // let's update the default instead...
                                const index =
                                    assignmentIndex.getEntityByPropValue(
                                        "value",
                                        lc2default[lcValue]
                                    )
                                const oldModel =
                                    assignmentIndex.getEntityObject(index)
                                oldModel.assignmentValue =
                                    newModel.assignmentValue
                                oldModel.type = newModel.type
                                oldModel.action = newModel.action
                                assignmentIndex.setEntityObject(
                                    { ...oldModel },
                                    true
                                )
                            } else {
                                assignmentIndex.setEntityObject(newModel)
                            }
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
                    assignmentIndex,
                    defaultsModel,
                    model,
                    edit: true,
                    reserved: extractLcProps(assignmentIndex, "value", model),
                    save: (newModel) => {
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
                    assignmentIndex.setEntityPropValue(
                        index,
                        "action",
                        ASSIGNMENT.ACTION.IGNORE
                    )
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
                compact
                matcher={matcher}
                render={(item) => {
                    const defaultAssignment =
                        item.action === ASSIGNMENT.ACTION.DEFAULT &&
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
                            action={
                                defaultAssignment
                                    ? defaultAssignment.action
                                    : item.action
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

export {
    ASSIGNMENT,
    RenderWithAssignments,
    AssignmentStack,
    AssignmentIndex,
    QueryAssignmentIndex,
    HeadersAssignmentIndex,
    BodyAssignmentIndex,
    extractContentTypeFromAssignments,
    getExtractPathForString
}
