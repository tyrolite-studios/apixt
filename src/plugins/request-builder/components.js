import { useEffect, useMemo, useContext, useRef } from "react"
import { useModalWindow } from "components/modal"
import { isMethodWithRequestBody, getParsedQueryString } from "core/http"
import {
    ButtonGroup,
    FormGrid,
    SelectCells,
    Input,
    Button,
    RadioCells,
    InputCells,
    CustomCells
} from "components/form"
import {
    EntityPicker,
    BodyTextarea,
    useUpdateOnEntityIndexChanges,
    useCallAfterwards
} from "components/common"
import { useState } from "react"
import { OkCancelLayout, Tab, Tabs } from "components/layout"
import {
    AssignmentIndex,
    AssignmentStack,
    extractContentTypeFromAssignments
} from "entities/assignments"
import { AppContext } from "components/context"
import { SaveRequestForm } from "entities/requests"
import { extractLcProps } from "core/entity"
import { ClassNames, d, cloneDeep } from "core/helper"
import { RequestAssingmentsPickerCells } from "entities/request-assignments"
import { APIS, ApiSelect } from "entities/apis"
import { SimpleRoutePath } from "entities/routes"
import { HistoryEntryPicker } from "entities/history-entry"
import { Checkbox } from "../../components/form"
import { without } from "../../core/helper"

const httpMethodOptions = [
    { id: "POST", name: "POST" },
    { id: "GET", name: "GET" },
    { id: "OPTIONS", name: "OPTIONS" },
    { id: "PATCH", name: "PATH" },
    { id: "DELETE", name: "DELETE" },
    { id: "PUT", name: "PUT" },
    { id: "HEAD", name: "HEAD" }
]

const pathMatchRegexp = /^https?\:\/\/[^\/]+(\/.*)$/
const urlInputRegexp = /^https?:\/\/[^\/]+$/

const strategyOptions = [
    { id: "new", name: "New Request" },
    { id: "add", name: "Add to request" }
]

function ImportForm({ save, close }) {
    const aContext = useContext(AppContext)

    const [url, setUrlRaw] = useState("")
    const [hasApi, setHasApi] = useState("")
    const [hasPath, setHasPath] = useState("")
    const [hasQuery, setHasQuery] = useState("")
    const [assignments, setAssignments] = useState({})
    const [importApi, setImportApi] = useState(true)
    const [importPath, setImportPath] = useState(true)
    const [importQuery, setImportQuery] = useState(true)
    const [skipKeys, setSkipKeys] = useState([])
    const [strategy, setStrategy] = useState("new")

    const getSkipQueryKey = (key) => {
        return !skipKeys.includes(key)
    }

    const getSkipQueryKeySetter = (key) => {
        return (value) =>
            setSkipKeys(value ? without(skipKeys, key) : [...skipKeys, key])
    }

    const apis = useMemo(() => {
        return [
            { id: "0", url: aContext.config.baseUrl, name: "current" },
            aContext.apiIndex.getEntityObjects()
        ]
    }, [])

    const setUrl = (value) => {
        const [urlWithoutHash] = value.split("#")
        let [apiAndPath, foundQuery = ""] = urlWithoutHash.split("?")
        if (!foundQuery && apiAndPath.indexOf("=") > -1) {
            foundQuery = apiAndPath
            apiAndPath = ""
        }

        if (foundQuery) {
            setAssignments(getParsedQueryString(foundQuery))
        }

        let foundApi = ""
        let foundPath = apiAndPath
        if (apiAndPath) {
            for (const api of apis) {
                if (!apiAndPath.startsWith(api.url)) continue

                foundApi = api
                foundPath = apiAndPath.substring(api.url.length)
                break
            }
            if (!foundApi) {
                const matches = pathMatchRegexp.exec(apiAndPath)
                if (matches !== null) {
                    foundPath = matches[1]
                } else {
                    const subMatches = urlInputRegexp.exec(foundPath)
                    if (
                        subMatches !== null ||
                        "https://".startsWith(foundPath) ||
                        "http://".startsWith(foundPath)
                    ) {
                        foundPath = ""
                    }
                }
            }
        }
        setHasApi(foundApi)
        setHasPath(foundPath)
        setHasQuery(foundQuery)

        setUrlRaw(value)
    }

    const importUrl = () => {
        const result = { strategy }
        if (hasApi && importApi) {
            result.api = hasApi.value
        }
        if (hasPath && importPath) {
            result.path = hasPath
        }
        if (hasQuery && importQuery) {
            const notSkipped = {}
            let hasValues = false
            for (const key of Object.keys(assignments)) {
                if (skipKeys.includes(key)) continue

                hasValues = true
                notSkipped[key] = assignments[key]
            }
            if (hasValues) {
                result.assignments = notSkipped
            }
        }
        save(result)
    }

    return (
        <OkCancelLayout submit ok={importUrl} cancel={close}>
            <div className="p-2">
                <FormGrid>
                    <RadioCells
                        name="Import:"
                        value={strategy}
                        set={setStrategy}
                        options={strategyOptions}
                    />
                    <InputCells
                        name="URL:"
                        value={url}
                        set={setUrl}
                        autoFocus
                        required={url === ""}
                        className="w-full"
                    />
                    <CustomCells name="Selection:">
                        <div className="stack-v gap-2 divide-y divide-header-border">
                            {hasApi !== "" && (
                                <div className="stack-h gap-2 text-xs p-2">
                                    <div className="stack-h gap-2">
                                        <Checkbox
                                            value={importApi}
                                            set={setImportApi}
                                        />
                                        API:
                                    </div>
                                    <div
                                        className={
                                            "text-sm" +
                                            (importApi ? "" : " opacity-30")
                                        }
                                    >
                                        {hasApi.name}
                                    </div>
                                </div>
                            )}

                            {hasPath !== "" && (
                                <div className="stack-h gap-2 text-xs p-2">
                                    <div className="stack-h gap-2">
                                        <Checkbox
                                            value={importPath}
                                            set={setImportPath}
                                        />
                                        Path:
                                    </div>
                                    <div
                                        className={
                                            "text-sm" +
                                            (importPath ? "" : " opacity-30")
                                        }
                                    >
                                        {hasPath}
                                    </div>
                                </div>
                            )}

                            {hasQuery !== "" && (
                                <div className="stack-h gap-2 text-xs p-2">
                                    <div className="stack-h gap-2">
                                        <Checkbox
                                            value={importQuery}
                                            set={setImportQuery}
                                        />
                                        Query:
                                    </div>
                                    <div className="stack-v text-sm gap-2">
                                        {Object.entries(assignments).map(
                                            ([name, value]) => (
                                                <div
                                                    key={name}
                                                    className="stack-h gap-2"
                                                >
                                                    <Checkbox
                                                        disabled={!importQuery}
                                                        value={getSkipQueryKey(
                                                            name
                                                        )}
                                                        set={getSkipQueryKeySetter(
                                                            name
                                                        )}
                                                    />
                                                    <div className="stack-v">
                                                        <div className="opacity-50 text-xs">
                                                            {name}:
                                                        </div>
                                                        <div
                                                            className={
                                                                importQuery &&
                                                                getSkipQueryKey(
                                                                    name
                                                                )
                                                                    ? ""
                                                                    : "opacity-30"
                                                            }
                                                        >
                                                            {value}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CustomCells>
                </FormGrid>
            </div>
        </OkCancelLayout>
    )
}

function getDefaultlessClone(model) {
    if (!model) return model

    const obj = {}
    for (const [key, value] of Object.entries(model)) {
        if (value.type === "default") continue

        obj[key] = cloneDeep(value)
    }
    return obj
}

function RequestBuilder({ close, request, assignments }) {
    const aContext = useContext(AppContext)
    const SaveAsModal = useModalWindow()
    const ImportModal = useModalWindow()
    useUpdateOnEntityIndexChanges(aContext.defaultsIndex)
    const callAfterwards = useCallAfterwards()

    const [active, setActive] = useState("")
    const [api, setApi] = useState(request?.api ?? aContext.getLastApiId())
    const [method, setMethod] = useState(request?.method ?? "POST")
    const [path, setPath] = useState(request?.path ?? "/")
    const [body, setBody] = useState(request?.body ?? "")
    const [defaults, setDefaults] = useState(
        request?.defaults ?? aContext.apiSettings.preselectedDefaults
    )
    const [showDefaults, setShowDefaultsRaw] = useState(
        aContext.apiSettings.showDefaults
    )
    const setShowDefaults = (value) => {
        aContext.setApiSetting("showDefaults", value)
        setShowDefaultsRaw(value)
    }
    const queryAssignmentIndex = useMemo(
        () => new AssignmentIndex(assignments?.query ?? {}),
        []
    )
    const headersAssignmentIndex = useMemo(
        () => new AssignmentIndex(assignments?.headers ?? {}),
        []
    )
    useUpdateOnEntityIndexChanges(headersAssignmentIndex)
    const bodyAssignmentIndex = useMemo(
        () => new AssignmentIndex(assignments?.body ?? {}),
        []
    )
    const syncedRef = useRef(false)
    const defaultsModel = useMemo(() => {
        syncedRef.current = false
        return aContext.getDefaults(defaults)
    }, [defaults, aContext.defaultsIndex.lastModified, active])

    if (!syncedRef.current) {
        const { query, headers, body } = defaultsModel
        queryAssignmentIndex.syncToDefaults(query)
        headersAssignmentIndex.syncToDefaults(headers)
        bodyAssignmentIndex.syncToDefaults(body)
        syncedRef.current = true
    }
    const hasBody = isMethodWithRequestBody(method)

    const bodyType = useMemo(() => {
        if (hasBody) {
            let contentType = extractContentTypeFromAssignments(
                headersAssignmentIndex.model
            )
            if (contentType === null) {
                contentType = extractContentTypeFromAssignments(
                    defaultsModel.headers
                )
            }
            if (!contentType) {
                // TODO try to extract first body type from history
                contentType = ""
            }

            if (contentType.endsWith("/json")) return "json"
            if (contentType.endsWith("/xml")) return "xml"
            if (contentType.endsWith("/html")) return "html"
        }
        return "text"
    }, [hasBody, headersAssignmentIndex.lastModified, defaultsModel])

    const loadedMode = useRef(request?.inputMode)
    const lastBodyTypeMode = aContext.getLastBodyTypeMode(bodyType)
    const [inputMode, setInputMode] = useState(lastBodyTypeMode)
    if (loadedMode.current && lastBodyTypeMode != loadedMode.current) {
        callAfterwards(
            setBody,
            aContext.doBodyConversion(
                body,
                loadedMode.current,
                lastBodyTypeMode
            )
        )
        loadedMode.current = null
    }

    const startRequest = () => {
        const request = {
            api,
            method,
            defaults,
            path,
            body,
            inputMode: hasBody ? inputMode : undefined
        }
        const assignments = {
            query: getDefaultlessClone(queryAssignmentIndex.model),
            headers: getDefaultlessClone(headersAssignmentIndex.model),
            body: hasBody
                ? getDefaultlessClone(bodyAssignmentIndex.model)
                : undefined
        }
        aContext.startContentStream(request, assignments)
        close()
    }

    const load = (model) => {
        const { request, assignments } = model
        setActive(model.value ?? "")
        setApi(request.api)
        setMethod(request.method)
        setPath(request.path)

        setBody(request.body)
        queryAssignmentIndex.setModel(assignments.query)
        headersAssignmentIndex.setModel(assignments.headers)
        bodyAssignmentIndex.setModel(assignments.body)
        setDefaults(request.defaults)
        loadedMode.current = request.inputMode
        syncedRef.current = false
        aContext.defaultsIndex.notify()
    }

    const launcherParams = {
        api,
        setApi,
        method,
        setMethod,
        path,
        setPath,
        body,
        setBody,
        inputMode,
        setInputMode,
        bodyType,
        defaults,
        setDefaults,
        defaultsModel,
        showDefaults,
        setShowDefaults,
        queryAssignmentIndex,
        headersAssignmentIndex,
        bodyAssignmentIndex
    }

    const buttons = [
        {
            name: "New",
            onPressed: () => {
                setActive("")
                setMethod("GET")
                setPath("/")
                setBody("")
                setDefaults(aContext.apiSettings.preselectedDefaults)
                queryAssignmentIndex.setModel({})
                headersAssignmentIndex.setModel({})
                bodyAssignmentIndex.setModel({})
                aContext.defaultsIndex.notify()
            }
        },
        {
            name: "Import",
            onPressed: () => {
                ImportModal.open({
                    save: (model) => {
                        if (model.path) {
                            setPath(model.path)
                        }
                        const add = model.strategy === "add"
                        if (model.assignments) {
                            const newModel = {}
                            for (const [
                                value,
                                assignmentValue
                            ] of Object.entries(model.assignments)) {
                                newModel[value] = {
                                    type: "set",
                                    assignmentValue
                                }
                            }
                            queryAssignmentIndex.setModel(
                                add
                                    ? {
                                          ...queryAssignmentIndex.model,
                                          ...newModel
                                      }
                                    : newModel
                            )
                        }
                        if (!add) {
                            if (model.api) {
                                setApi(model.api)
                            }
                            setActive("")
                            setMethod("GET")
                            setBody("")
                            setDefaults(
                                aContext.apiSettings.preselectedDefaults
                            )
                            headersAssignmentIndex.setModel({})
                            bodyAssignmentIndex.setModel({})
                            aContext.defaultsIndex.notify()
                        }
                        ImportModal.close()
                    }
                })
            }
        },
        {
            name: "Save",
            disabled: active === "",
            onPressed: () => {
                const requestIndex = aContext.requestIndex
                const index = requestIndex.getEntityByPropValue("value", active)
                const model = requestIndex.getEntityObject(index)
                requestIndex.setEntityObject(
                    {
                        ...model,
                        request: cloneDeep({
                            api,
                            defaults,
                            method,
                            path,
                            body
                        }),
                        assignments: {
                            query: getDefaultlessClone(
                                queryAssignmentIndex.model
                            ),
                            headers: getDefaultlessClone(
                                headersAssignmentIndex.model
                            ),
                            body: isMethodWithRequestBody(method)
                                ? getDefaultlessClone(bodyAssignmentIndex.model)
                                : undefined
                        }
                    },
                    true
                )
            }
        },
        {
            name: "Save As...",
            onPressed: () => {
                SaveAsModal.open({
                    model: { name: "" },
                    reserved: extractLcProps(aContext.requestIndex, "name"),
                    save: ({ name }) => {
                        const value = crypto.randomUUID()
                        aContext.requestIndex.setEntityObject({
                            value,
                            name,
                            request: {
                                api,
                                defaults,
                                method,
                                path,
                                body
                            },
                            assignments: {
                                query: getDefaultlessClone(
                                    queryAssignmentIndex.model
                                ),
                                headers: getDefaultlessClone(
                                    headersAssignmentIndex.model
                                ),
                                body: isMethodWithRequestBody(method)
                                    ? getDefaultlessClone(
                                          bodyAssignmentIndex.model
                                      )
                                    : undefined
                            }
                        })
                        setActive(value)
                        SaveAsModal.close()
                    }
                })
            }
        }
    ]
    const requestCls = ClassNames("px-2 auto")
    requestCls.addIf(
        active !== "",
        "bg-active-bg text-active-text py-1 border border-header-border text-xs",
        "opacity-50 text-sm"
    )
    return (
        <OkCancelLayout
            scroll={false}
            cancel={close}
            submit
            ok={startRequest}
            okLabel="Launch"
        >
            <>
                <div className="w-full h-full divide-x divide-header-border stack-h overflow-hidden">
                    <div className="stack-v h-full overflow-hidden">
                        <div className="stack-h gap-2 p-2">
                            <ApiSelect
                                api={api}
                                setApi={setApi}
                                apiIndex={aContext.apiIndex}
                                apiEnvIndex={aContext.apiEnvIndex}
                            />
                        </div>

                        <Tabs className="overflow-hidden">
                            <Tab name="Stored" active>
                                <div className="p-2 h-full">
                                    <EntityPicker
                                        className="h-full"
                                        entityIndex={aContext.requestIndex}
                                        pick={load}
                                        matcher={(idx) =>
                                            aContext.requestIndex.getEntityPropValue(
                                                idx,
                                                "request"
                                            ).api === api
                                        }
                                        render={({ name, request }) => (
                                            <div className="stack-v">
                                                <div className="text-sm">
                                                    {name}
                                                </div>
                                                <div className="text-xs opacity-50">
                                                    {request.method}{" "}
                                                    {request.path}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                            </Tab>
                            <Tab name="History">
                                <div className="p-2 h-full">
                                    <HistoryEntryPicker
                                        className="h-full"
                                        pick={({ request, assignments }) =>
                                            load({ request, assignments })
                                        }
                                        api={api}
                                        historyEntryIndex={
                                            aContext.historyEntryIndex
                                        }
                                    />
                                </div>
                            </Tab>
                            <Tab name="Routes">
                                <div className="p-2 h-full">
                                    <EntityPicker
                                        className="h-full"
                                        pick={({ path, methods, api }) => {
                                            load({
                                                request: {
                                                    api,
                                                    path,
                                                    defaults:
                                                        aContext.apiSettings
                                                            .preselectedDefaults,
                                                    method: methods[0],
                                                    body: ""
                                                },
                                                assignments: {}
                                            })
                                        }}
                                        entityIndex={aContext.routeIndex}
                                        matcher={(idx) =>
                                            aContext.routeIndex.getEntityPropValue(
                                                idx,
                                                "api"
                                            ) === api
                                        }
                                        render={({ path, methods }) => (
                                            <div className="stack-v text-xs">
                                                <SimpleRoutePath path={path} />
                                                <div className="opacity-50">
                                                    {methods.join(", ")}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                            </Tab>
                        </Tabs>
                    </div>

                    <div className="stack-v auto h-full">
                        <div className="px-2 pt-2 w-full">
                            <div className="stack-h items-center w-full gap-2 bg-header-bg/25 p-1 border border-header-border/50">
                                <div className={requestCls.value}>
                                    {active === ""
                                        ? "New Request..."
                                        : aContext.getRequestName(active)}
                                </div>
                                <ButtonGroup buttons={buttons} />
                            </div>
                        </div>

                        <div className="stack-v auto h-full overflow-hidden">
                            <div className="overflow-y-auto auto">
                                <RequestLauncher {...launcherParams} />
                            </div>
                        </div>
                    </div>
                </div>

                <SaveAsModal.content>
                    <SaveRequestForm {...SaveAsModal.props} />
                </SaveAsModal.content>

                <ImportModal.content>
                    <ImportForm {...ImportModal.props} />
                </ImportModal.content>
            </>
        </OkCancelLayout>
    )
}

const RequestLauncher = ({
    method,
    setMethod,
    path,
    setPath,
    body,
    bodyType,
    inputMode,
    setInputMode,
    setBody,
    defaults,
    setDefaults,
    showDefaults,
    setShowDefaults,
    defaultsModel = {},
    queryAssignmentIndex,
    headersAssignmentIndex,
    bodyAssignmentIndex
}) => {
    const aContext = useContext(AppContext)
    const hasBody = isMethodWithRequestBody(method)
    const getMatcher = (entityIndex) => {
        if (showDefaults) return

        return (index) =>
            entityIndex.getEntityPropValue(index, "type") !== "default"
    }

    return (
        <div className="auto overflow-hidden">
            <FormGrid>
                <SelectCells
                    name="Method:"
                    options={httpMethodOptions}
                    value={method}
                    set={setMethod}
                />
                <CustomCells name="Path:">
                    <div className="stack-h gap-2 w-full">
                        <Input
                            name="Path:"
                            value={path}
                            set={setPath}
                            className="w-full"
                        />
                        <Button name="Params" disabled={true} />
                    </div>
                </CustomCells>
                <RequestAssingmentsPickerCells
                    name="Defaults:"
                    requestAssignmentsIndex={aContext.defaultsIndex}
                    value={defaults}
                    set={setDefaults}
                    visibility={showDefaults}
                    setVisibility={setShowDefaults}
                />
                <CustomCells name="Query:">
                    <AssignmentStack
                        assignmentIndex={queryAssignmentIndex}
                        defaultsModel={defaultsModel.query}
                        matcher={getMatcher(queryAssignmentIndex)}
                    />
                </CustomCells>
                <CustomCells name="Headers:">
                    <AssignmentStack
                        assignmentIndex={headersAssignmentIndex}
                        defaultsModel={defaultsModel.headers}
                        matcher={getMatcher(headersAssignmentIndex)}
                    />
                </CustomCells>
                {hasBody && (
                    <CustomCells name="Body:">
                        <div className="stack-v">
                            {bodyType !== "pending" && (
                                <BodyTextarea
                                    value={body}
                                    set={setBody}
                                    mode={inputMode}
                                    setMode={setInputMode}
                                    rows={10}
                                    type={bodyType}
                                />
                            )}
                            <div className="text-xs py-2">
                                Auto-Assignments:
                            </div>
                            <AssignmentStack
                                assignmentIndex={bodyAssignmentIndex}
                                defaultsModel={defaultsModel.body}
                                matcher={getMatcher(bodyAssignmentIndex)}
                            />
                        </div>
                    </CustomCells>
                )}
            </FormGrid>
        </div>
    )
}

function RequestBuilderWindow({ plugin }) {
    const RequestBuilderModal = useModalWindow()

    useEffect(() => {
        plugin.setButtonHandler("builder", () => {
            RequestBuilderModal.open({})
        })
        plugin.setOpenEditor(RequestBuilderModal.open)
    }, [])

    return (
        <RequestBuilderModal.content
            name="Request Builder"
            width="900px"
            height="500px"
        >
            <RequestBuilder {...RequestBuilderModal.props} />
        </RequestBuilderModal.content>
    )
}

export { RequestBuilderWindow }
