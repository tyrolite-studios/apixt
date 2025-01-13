import { useEffect, useMemo, useContext, useRef, Fragment } from "react"
import { useModalWindow } from "components/modal"
import {
    isMethodWithRequestBody,
    getParsedQueryString,
    getWithoutProtocol,
    getResolvedPath
} from "core/http"
import {
    ButtonGroup,
    FormGrid,
    SelectCells,
    Input,
    Button,
    Checkbox,
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
import { OkCancelLayout, Tab, Tabs, Centered } from "components/layout"
import { AppContext } from "components/context"
import { extractLcProps } from "core/entity"
import {
    ASSIGNMENT,
    QueryAssignmentIndex,
    HeadersAssignmentIndex,
    BodyAssignmentIndex,
    AssignmentStack,
    extractContentTypeFromAssignments
} from "entities/assignments"
import { SaveRequestForm } from "entities/requests"
import {
    ClassNames,
    d,
    cloneDeep,
    isObject,
    isArray,
    without
} from "core/helper"
import { RequestAssingmentsPickerCells } from "entities/request-assignments"
import { APIS, ApiSelect } from "entities/apis"
import { SimpleRoutePath } from "entities/routes"
import { HistoryEntryPicker } from "entities/history-entry"
import { useRouteParamsModal } from "entities/routes"
import { isString } from "../../core/helper"
import { useErrorWindow, useLoadingSpinner } from "../../components/common"

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

const actionOptions = [
    { id: "add", name: "Add" },
    { id: "replace", name: "Replace" },
    { id: "new", name: "New" }
]

function QueryValue({ value }) {
    if (isObject(value)) {
        return (
            <div className="stack-v text-xs">
                <div>{"{"}</div>
                <div className="stack-h gap-2">
                    <div> </div>
                    <div className="grid grid-cols-2 gap-2 pl-2">
                        {Object.entries(value).map(([name, subValue]) => (
                            <Fragment key={name}>
                                <div>{JSON.stringify(name)}:</div>
                                {QueryValue({ value: subValue })}
                            </Fragment>
                        ))}
                    </div>
                </div>
                <div>{"}"}</div>
            </div>
        )
    }
    if (isArray(value)) {
        return (
            <div className="stack-v text-xs">
                <div>{"["}</div>
                <div className="stack-h gap-2">
                    <div> </div>
                    <div className="grid grid-cols-2 pl-2">
                        {Object.values(value).map((subValue, index) => (
                            <Fragment key={index}>
                                <div>{QueryValue({ value: subValue })}</div>
                                <div className="text-sm">
                                    {index < value.length - 1 ? "," : ""}
                                </div>
                            </Fragment>
                        ))}
                    </div>
                </div>
                <div>{"]"}</div>
            </div>
        )
    }
    return <div className="text-sm">{JSON.stringify(value)}</div>
}

function ImportForm({ save, close, ...props }) {
    const aContext = useContext(AppContext)

    const [url, setUrlRaw] = useState("")
    const [hasApi, setHasApi] = useState("")
    const [hasPath, setHasPath] = useState("")
    const [hasQuery, setHasQuery] = useState("")
    const [hasRawQuery, setHasRawQuery] = useState("")
    const [assignments, setAssignments] = useState({})
    const [paramIndex, setParamIndex] = useState([])
    const [importApi, setImportApi] = useState(true)
    const [importPath, setImportPath] = useState(true)
    const [importQuery, setImportQuery] = useState(true)
    const [skipKeys, setSkipKeys] = useState([])
    const [skipIndex, setSkipIndex] = useState([])
    const [action, setActionRaw] = useState("add")
    const setAction = (value) => {
        setActionRaw(value)
        setUrl(url, value)
    }

    const getSkipQueryKey = (key) => {
        return !skipKeys.includes(key)
    }

    const getSkipQueryIndex = (idx) => {
        return !skipIndex.includes(idx)
    }
    const getSkipQueryKeySetter = (key) => {
        return (value) =>
            setSkipKeys(value ? without(skipKeys, key) : [...skipKeys, key])
    }
    const getSkipQueryIndexSetter = (idx) => {
        return (value) =>
            setSkipIndex(value ? without(skipIndex, idx) : [...skipIndex, idx])
    }

    const apis = useMemo(() => {
        const items = aContext.apiIndex.getEntityObjects()
        const result = [
            {
                id: APIS.OPTION.CURRENT,
                url: aContext.config.baseUrl,
                name: "current"
            }
        ]
        for (const { value, url, name } of items) {
            result.push({ id: value, url, name })
        }
        const envUrls = aContext.apiEnvIndex.getPropValues("url")
        for (const url of envUrls) {
            result.push({ id: APIS.OPTION.CURRENT, url, name: "current" })
        }
        for (const { envValues, value, name } of items) {
            if (!envValues) continue

            for (const envUrl of Object.values(envValues)) {
                result.push({ id: value, url: envUrl, name })
            }
        }
        const without = []
        for (const item of result) {
            without.push({ ...item, url: getWithoutProtocol(item.url) })
        }
        return [...result, ...without]
    }, [])

    const setUrl = (value, newAction) => {
        if (!newAction) newAction = action

        const [urlWithoutHash] = value.split("#")
        let [apiAndPath, foundQuery = ""] = urlWithoutHash.split("?")
        if (!foundQuery && apiAndPath.indexOf("=") > -1) {
            foundQuery = apiAndPath
            apiAndPath = ""
        }

        let foundRawQuery = ""
        if (foundQuery) {
            try {
                const parsedJson = getParsedQueryString(foundQuery)
                setAssignments(parsedJson)
            } catch (e) {
                foundRawQuery = foundQuery
                setParamIndex(foundQuery.split("&"))
                foundQuery = ""
                setAssignments({})
            }
        }

        let foundApi = ""
        let foundPath = apiAndPath
        if (apiAndPath) {
            for (const api of apis) {
                if (!apiAndPath.startsWith(api.url)) continue

                if (newAction === "new" && api.id !== props.api) {
                    foundApi = api
                }
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
        setHasRawQuery(foundRawQuery)

        setUrlRaw(value)
    }

    const importUrl = () => {
        const result = { action }
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
        if (hasRawQuery && importQuery) {
            let hasValues = false
            const params = []
            for (const [idx, value] of paramIndex.entries()) {
                if (skipIndex.includes(idx)) continue

                hasValues = true
                params.push(value)
            }
            if (hasValues) {
                result.path = (result.path ?? "") + "?" + params.join("&")
            }
        }
        save(result)
    }

    const apiCls = ClassNames("p-2 text-sm")
    apiCls.addIf(!importApi, "opacity-30")
    const pathCls = ClassNames("p-2 text-sm")
    pathCls.addIf(!importPath, "opacity-30")
    const queryCls = ClassNames("stack-v text-sm gap-2 p-2")
    const queryOnCls = ClassNames("")
    queryOnCls.addIf(importPath, "opacity-50", "opacity-30")
    const queryOffCls = ClassNames("")
    queryOffCls.addIf(!importQuery, "opacity-30")

    return (
        <OkCancelLayout submit ok={importUrl} cancel={close}>
            <div className="p-2">
                <FormGrid>
                    <RadioCells
                        name="Action:"
                        value={action}
                        set={setAction}
                        options={actionOptions}
                    />
                    <InputCells
                        name="URL:"
                        value={url}
                        set={setUrl}
                        autoFocus
                        required={url === ""}
                        className="w-full"
                    />
                    <CustomCells name="Import:">
                        <div className="grid grid-cols-[min-content_auto] [clip-path:inset(2px_0_0)] *:border-t *:border-header-border/50">
                            {url === "" && (
                                <div className="col-span-2 p-2">
                                    <Centered className="opacity-50 text-xs">
                                        Please enter a valid URL
                                    </Centered>
                                </div>
                            )}
                            {hasApi !== "" && (
                                <Fragment>
                                    <div className="stack-h gap-2 text-xs p-2">
                                        <Checkbox
                                            value={importApi}
                                            set={setImportApi}
                                        />
                                        API:
                                    </div>
                                    <div className={apiCls.value}>
                                        {hasApi.name}
                                    </div>
                                </Fragment>
                            )}

                            {hasPath !== "" && (
                                <Fragment>
                                    <div className="stack-h gap-2 text-xs p-2">
                                        <Checkbox
                                            value={importPath}
                                            set={setImportPath}
                                        />
                                        Path:
                                    </div>
                                    <div className={pathCls.value}>
                                        {hasPath}
                                    </div>
                                </Fragment>
                            )}
                            {hasRawQuery !== "" && (
                                <Fragment>
                                    <div className="stack-h gap-2 text-xs p-2">
                                        <Checkbox
                                            value={importQuery}
                                            set={setImportQuery}
                                        />
                                        Query:
                                    </div>

                                    <div className={queryCls.value}>
                                        {paramIndex
                                            .map((x) => x.split("="))
                                            .map(([name, value], index) => (
                                                <div
                                                    key={name}
                                                    className="stack-h gap-2"
                                                >
                                                    <Checkbox
                                                        disabled={!importQuery}
                                                        value={getSkipQueryIndex(
                                                            index
                                                        )}
                                                        set={getSkipQueryIndexSetter(
                                                            index
                                                        )}
                                                    />
                                                    <div className="stack-v gap-1">
                                                        <div
                                                            className={
                                                                queryOnCls.value
                                                            }
                                                        >
                                                            {decodeURIComponent(
                                                                name
                                                            )}
                                                            :
                                                        </div>
                                                        <div
                                                            className={
                                                                importQuery &&
                                                                getSkipQueryIndex(
                                                                    index
                                                                )
                                                                    ? queryOffCls.value
                                                                    : queryOnCls.value
                                                            }
                                                        >
                                                            <QueryValue
                                                                value={value}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </Fragment>
                            )}
                            {hasQuery !== "" && (
                                <Fragment>
                                    <div className="stack-h gap-2 text-xs p-2">
                                        <Checkbox
                                            value={importQuery}
                                            set={setImportQuery}
                                        />
                                        Query:
                                    </div>
                                    <div className={queryCls.value}>
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
                                                    <div className="stack-v gap-1">
                                                        <div
                                                            className={
                                                                queryOnCls.value
                                                            }
                                                        >
                                                            {name}:
                                                        </div>
                                                        <div
                                                            className={
                                                                importQuery &&
                                                                getSkipQueryKey(
                                                                    name
                                                                )
                                                                    ? queryOffCls.value
                                                                    : queryOnCls.value
                                                            }
                                                        >
                                                            <QueryValue
                                                                value={value}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </Fragment>
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
        if (value.action === ASSIGNMENT.ACTION.DEFAULT) continue

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
        () => new QueryAssignmentIndex(assignments?.query ?? {}),
        []
    )
    const headersAssignmentIndex = useMemo(
        () => new HeadersAssignmentIndex(assignments?.headers ?? {}),
        []
    )
    useUpdateOnEntityIndexChanges(headersAssignmentIndex)
    const bodyAssignmentIndex = useMemo(
        () => new BodyAssignmentIndex(assignments?.body ?? {}),
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
            name: "URL…",
            onPressed: () => {
                ImportModal.open({
                    api,
                    save: (model) => {
                        const isNew = model.action === "new"
                        if (model.path) {
                            setPath(model.path)
                        } else if (isNew) {
                            setPath("/")
                        }
                        if (model.assignments) {
                            const newModel = {}
                            for (const [
                                value,
                                assignmentValue
                            ] of Object.entries(model.assignments)) {
                                newModel[value] = {
                                    action: ASSIGNMENT.ACTION.SET,
                                    type: isString(assignmentValue)
                                        ? ASSIGNMENT.TYPE.STRING
                                        : ASSIGNMENT.TYPE.JSON,
                                    assignmentValue: isString(assignmentValue)
                                        ? assignmentValue
                                        : JSON.stringify(assignmentValue)
                                }
                            }
                            queryAssignmentIndex.setModel(
                                model.action === "add"
                                    ? {
                                          ...queryAssignmentIndex.model,
                                          ...newModel
                                      }
                                    : newModel
                            )
                        }
                        if (isNew) {
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
                            body,
                            inputMode
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
            name: "Save As…",
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
                                body,
                                inputMode
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
    const spinner = useLoadingSpinner()
    const errorMessage = useErrorWindow()

    return (
        <OkCancelLayout
            scroll={false}
            cancel={close}
            submit
            ok={startRequest}
            okLabel="Launch"
        >
            <>
                {spinner.Modal}
                {errorMessage.Modal}
                <div className="w-full h-full divide-x divide-header-border stack-h overflow-hidden">
                    <div className="stack-v h-full overflow-hidden max-w-[50%]">
                        <div className="stack-h gap-2 p-2">
                            <ApiSelect
                                api={api}
                                setApi={setApi}
                                apiIndex={aContext.apiIndex}
                                apiEnvIndex={aContext.apiEnvIndex}
                            />
                        </div>

                        <Tabs
                            className="overflow-hidden"
                            persistId="request-builder.picker"
                        >
                            <Tab name="Stored" active>
                                <div className="p-2 h-full">
                                    <EntityPicker
                                        className="h-full"
                                        entityIndex={aContext.requestIndex}
                                        pick={load}
                                        filter
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
                                        filter
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
                                        filter
                                        pick={({ path, methods, api }) => {
                                            load({
                                                request: {
                                                    api,
                                                    path: getResolvedPath(path),
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
    api,
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
    const pathInfo = useMemo(() => {
        return aContext.getMatchingRoutePath(api, path, method)
    }, [api, method, path])
    const { RouteParamsModal, openRouteParamsModal } = useRouteParamsModal({
        path,
        pathInfo,
        save: (newPath) => setPath(newPath)
    })
    const hasBody = isMethodWithRequestBody(method)
    const getMatcher = (entityIndex) => {
        if (showDefaults) return

        return (index) =>
            entityIndex.getEntityPropValue(index, "action") !==
            ASSIGNMENT.ACTION.DEFAULT
    }

    return (
        <>
            <div className="auto overflow-hidden">
                <FormGrid>
                    <SelectCells
                        name="Method:"
                        options={httpMethodOptions}
                        value={method}
                        set={setMethod}
                    />
                    <CustomCells name="Path:">
                        <div className="stack-v gap-2">
                            <div className="stack-h gap-2 w-full">
                                <Input
                                    name="Path:"
                                    value={path}
                                    set={setPath}
                                    className="w-full"
                                />
                                <Button
                                    name="Params"
                                    disabled={
                                        !pathInfo || pathInfo.varCount === 0
                                    }
                                    onPressed={() => openRouteParamsModal()}
                                />
                            </div>
                            <div className="text-xs gap-2 stack-h pl-2 pb-2">
                                <div className="opacity-50">Route:</div>
                                <div>
                                    {pathInfo ? (
                                        <SimpleRoutePath path={pathInfo.path} />
                                    ) : (
                                        <span className="opacity-50">
                                            {"-"}
                                        </span>
                                    )}
                                </div>
                            </div>
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

            {RouteParamsModal}
        </>
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
