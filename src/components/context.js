import { createContext, useState, useRef, useContext, useEffect } from "react"
import { treeBuilder, CMD } from "core/tree"
import {
    startAbortableArrayStream,
    isMethodWithRequestBody,
    isMethodWithResponseBody,
    getQueryStringForJson,
    getBodyTypeFromResponseHeaders,
    getJsonForApiResponseHeaders,
    getPathInfo
} from "core/http"
import { useComponentUpdate, useLoadingSpinner } from "./common"
import { d, getParsedJson, apply, isObject, isString } from "core/helper"
import { PluginRegistry } from "core/plugin"
import {
    defaultApiSettings,
    defaultGlobalSettings,
    defaultKeyBindings
} from "./settings"
import {
    ASSIGNMENT,
    getExtractParts,
    isSupportedExtractBodyType
} from "entities/assignments"
import { RouteIndex } from "entities/routes"
import { ConstantIndex } from "entities/constants"
import { ApiIndex, APIS } from "entities/apis"
import { ApiEnvIndex } from "entities/api-envs"
import { RequestIndex } from "entities/requests"
import { RequestAssignmentsIndex } from "entities/request-assignments"
import { useModalWindow } from "./modal"
import { OkCancelLayout } from "./layout"
import { Checkbox, Input } from "./form"
import { HistoryEntryIndex } from "entities/history-entry"
import { startStageProcessing } from "core/processor"

const controller = window.controller
const AppContext = createContext(null)

function FixCursorArea() {
    const aContext = useContext(AppContext)
    const [fixCursor, setFixCursor] = useState(null)

    useEffect(() => {
        aContext.register("setFixCursor", setFixCursor)
    }, [])

    const style = {
        cursor: fixCursor ? fixCursor : "auto",
        zIndex: 999999
    }
    if (fixCursor === null) {
        style.display = "none"
    }
    return (
        <div
            key="fc"
            style={style}
            className="fixed top-0 left-0 bg-transparent full"
        />
    )
}

function SpinnerDiv() {
    const aContext = useContext(AppContext)
    const LoadingSpinner = useLoadingSpinner()
    useEffect(() => {
        aContext.register("spinner", LoadingSpinner)
    }, [])

    return <>{LoadingSpinner.Modal}</>
}

let rememberPrompts = true
const lastAnswers = {}
let rememberAnswers = {}

function Prompt({ close, prompts, assign }) {
    const [remember, setRememberRaw] = useState(rememberPrompts)
    const setRemember = (value) => {
        rememberPrompts = value
        setRememberRaw(value)
    }
    const [inputs, setInputs] = useState(() => {
        const values = []
        while (values.length < prompts.length) {
            const [question] = prompts[values.length]
            const lastAnswer = lastAnswers[question]
            values.push(lastAnswer ?? "")
        }
        return values
    })

    const elems = []
    let i = 0
    while (i < prompts.length) {
        const idx = i

        const [question] = prompts[idx]
        elems.push(
            <div key={question} className="stack-v gap-2 text-sm">
                <div>{question}</div>
                <Input
                    required
                    value={inputs[idx]}
                    set={(value) => {
                        const newValues = [...inputs]
                        newValues[idx] = value
                        setInputs(newValues)
                    }}
                />
            </div>
        )
        i++
    }
    elems.push(
        <div key="cb" className="stack-h gap-2 text-xs">
            <Checkbox value={remember} set={setRemember} />
            <div className="text-xs">Don't ask again</div>
        </div>
    )
    return (
        <OkCancelLayout
            cancel={close}
            submit={true}
            ok={() => {
                let i = 0
                while (i < inputs.length) {
                    const question = prompts[i][0]
                    const answer = inputs[i]
                    lastAnswers[question] = answer
                    if (rememberPrompts) {
                        rememberAnswers[question] = answer
                    }
                    i++
                }
                assign(inputs)
            }}
        >
            <div className="p-4 stack-v gap-2">{elems}</div>
        </OkCancelLayout>
    )
}

function PromptDiv() {
    const aContext = useContext(AppContext)
    const PromptModal = useModalWindow()
    useEffect(() => {
        aContext.register("openPrompt", PromptModal.open)
        aContext.register("closePrompt", PromptModal.close)
    }, [])
    return (
        <>
            <PromptModal.content name="Prompt">
                <Prompt {...PromptModal.props} />
            </PromptModal.content>
        </>
    )
}

function registerRouteApi({ config }) {
    const routeIndex = new RouteIndex(config.routes)

    const getMatchingRoutePath = (matchApi, resolvedFullpath, method) => {
        const [resolvedPath] = resolvedFullpath.split("?")
        for (const { path, methods, api } of routeIndex.getEntityObjects()) {
            if (!methods.includes(method) || matchApi !== api) continue

            const pathInfo = getPathInfo(path)
            const pathRegexp = new RegExp(pathInfo.regexp)
            if (pathRegexp.test(resolvedPath)) return pathInfo
        }
        return null
    }

    return {
        routeIndex,
        getMatchingRoutePath
    }
}

/*
 * The modal API allows to manage modals and windows
 */
function registerModalApi({ registry, register }) {
    register("buttonRefocus", null)
    register("focusStack", {
        elem: {},
        zIndex: null
    })
    register("modalStack", [])
    register("modalIds", [])
    register("lastTarget", null)

    const getModalLevel = () => registry("modalStack").length
    register("getModalLevel", getModalLevel)

    return {
        focusStack: registry("focusStack"),
        setButtonRefocus: (value) => {
            register("buttonRefocus", value)
        },
        pushModalId: (id) => registry("modalIds").push(id),
        popModalId: () => registry("modalIds").pop(),
        getModalLevel,
        openModal: () => {
            const { modalStack, focusStack, lastTarget, buttonRefocus } =
                registry()

            let zIndex = 10000
            const len = modalStack.length
            if (len > 0) {
                zIndex = modalStack[len - 1] + 10
            }
            modalStack.push(zIndex)
            focusStack.zIndex = zIndex
            focusStack.elem[zIndex] = {
                top: null,
                auto: null,
                start: null,
                setShadow: null,
                submit: null,
                lastFocus: buttonRefocus
                    ? buttonRefocus
                    : document.activeElement,
                lastTarget
            }
            return zIndex
        },
        getModalSubmit: () => {
            const { modalStack, focusStack } = registry()
            const zIndex = modalStack[modalStack.length - 1]
            return focusStack.elem[zIndex].submit
        },
        setModalSubmit: (submit) => {
            const { modalStack, focusStack } = registry()
            const zIndex = modalStack[modalStack.length - 1]
            focusStack.elem[zIndex].submit = submit
        },
        closeModal: (zIndex) => {
            const { modalStack, focusStack } = registry()

            const index = modalStack.indexOf(zIndex)
            if (index === -1) {
                return
            }
            modalStack.splice(index, 1)
            const { lastTarget, lastFocus } = focusStack.elem[zIndex]
            register("lastTarget", lastTarget)
            if (lastFocus) {
                requestAnimationFrame(() => {
                    if (typeof lastFocus === "function") {
                        lastFocus()
                    } else {
                        lastFocus.focus()
                    }
                })
            }
            delete focusStack.elem[zIndex]
            focusStack.zIndex = modalStack.length
                ? modalStack[modalStack.length - 1]
                : null
            if (focusStack.zIndex) {
                const old = focusStack.elem[focusStack.zIndex]
                if (old && old.setShadow) {
                    old.setShadow()
                }
            }
        },
        getLastTarget: () => registry("lastTarget")
    }
}

/*
 * The hotkey API manages action triggered by key bindings
 */
function registerHotkeyApi({ registry, register }) {
    const action2hotKey = defaultKeyBindings
    const hotKey2action = {}
    for (let [action, key] of Object.entries(action2hotKey)) {
        if (key !== null) {
            hotKey2action[key] = action
        }
    }
    register("hotKeyActions", {
        action2hotKey,
        hotKey2action
    })
    register("elemKeyBindings", [])

    const getHotKeyArea = (area) => {
        const { elemKeyBindings, getModalLevel } = registry()

        const currLevel = getModalLevel()
        for (let item of elemKeyBindings) {
            if (currLevel === item[3] && item[2] == area) {
                return item[0]
            }
        }
        return null
    }

    const getHandlerForAction = (
        action,
        elem,
        followLinks = true,
        passed = false
    ) => {
        const { elemKeyBindings, getModalLevel } = registry()

        const currLevel = getModalLevel()
        for (let [node, bindings, area, level, links] of elemKeyBindings) {
            if (elem === node && level === currLevel) {
                passed = true
                const binding = bindings[action]
                if (binding) {
                    return binding
                }
                if (followLinks) {
                    for (let link of links) {
                        const node = getHotKeyArea(link)
                        if (node) {
                            const binding = getHandlerForAction(
                                action,
                                node,
                                false,
                                passed
                            )
                            if (binding) {
                                return binding
                            }
                        }
                    }
                }
            }
        }
        if (!followLinks || !elem || elem.id === "modals-container") {
            return passed ? undefined : false
        }
        elem = elem.parentNode
        if (elem) {
            return getHandlerForAction(action, elem, true, passed)
        }
        return passed ? undefined : false
    }

    return {
        addElemKeyBinding: (
            elem,
            action2handlers = {},
            area = null,
            link = null
        ) => {
            const { getModalLevel } = registry()
            if (elem === null) {
                return
            }
            if (!link) {
                link = []
            } else if (!Array.isArray(link)) {
                link = [link]
            }
            registry("elemKeyBindings").push([
                elem,
                action2handlers,
                area,
                getModalLevel(),
                link
            ])
        },
        deleteElemKeyBindings: (elem) => {
            const { elemKeyBindings } = registry()

            let index = 0
            for (let item of elemKeyBindings) {
                if (item[0] === elem) {
                    elemKeyBindings.splice(index, 1)
                    break
                }
                index++
            }
        },
        getHotKeyArea,
        focusHotKeyArea: (area) => {
            let elem = getHotKeyArea(area)
            if (elem) {
                const areaElem = elem
                elem = elem.querySelector(".tabbed")
                if (elem) {
                    const { markFocusArea } = registry()
                    const rectElem =
                        areaElem.parentNode &&
                        areaElem.parentNode.classList.contains("parent")
                            ? areaElem.parentNode
                            : areaElem
                    markFocusArea(rectElem.getBoundingClientRect())
                    elem.focus()
                    register("lastTarget", elem)
                    return true
                }
            }
            return false
        },
        getHandlerForActionKey: (actionKey, elem) => {
            const { elemKeyBindings, hotKeyActions } = registry()
            if (elemKeyBindings.length === 0) {
                return null
            }
            const action = hotKeyActions.hotKey2action[actionKey]
            if (!action) {
                return null
            }
            let handler = getHandlerForAction(action, elem)

            if (handler === false) {
                // try hotkey region 1 when no area was found along the node path
                const node = getHotKeyArea(1)
                if (node) {
                    handler = getHandlerForAction(action, node)
                }
            }

            return handler ? handler : null
        },
        hotKeyActions: registry("hotKeyActions")
    }
}

/*
 *
 */
function registerSettingsApi({ registry, register, apiRef }) {
    register("globalStorage", controller.globalStorage)
    register("apiStorage", controller.apiStorage)
    register("tempStorage", controller.tempStorage)
    register("apiSettings", {})
    register("globalSettings", {})
    register("plugins", {})
    register("keyBindings", {})

    const rebuildSettings = (restart = true) => {
        const {
            apiStorage,
            globalStorage,
            apiSettings,
            globalSettings,
            keyBindings,
            plugins
        } = registry()
        const apiStored = apiStorage.getJson("settings", {})
        const newApiSettings = { ...defaultApiSettings, ...apiStored }
        apply(newApiSettings, apiSettings)

        const globalStored = globalStorage.getJson("settings", {})
        const newGlobalSettings = { ...defaultGlobalSettings, ...globalStored }
        apply(newGlobalSettings, globalSettings)

        const pluginsStored = apiStorage.getJson("plugins", {})
        const newPlugins = {
            ...PluginRegistry.getDefaultStates(),
            ...pluginsStored
        }
        apply(newPlugins, plugins)
        PluginRegistry.setStates(newPlugins)

        const keyBindingsStored = apiStorage.getJson("keyBindings", {})
        const newKeyBindings = {
            ...defaultKeyBindings,
            ...keyBindingsStored
        }
        apply(newKeyBindings, keyBindings)
        if (!restart) return

        apiRef.current.rebuildApiEnvs()
        apiRef.current.rebuildConstants()
        apiRef.current.update()
    }

    rebuildSettings(false)

    const persistApiSettings = () => {
        registry("apiStorage").setJson("settings", apiRef.current.apiSettings)
    }
    const setApiSetting = (name, value) => {
        apiRef.current.apiSettings[name] = value
        persistApiSettings()
    }

    return {
        apiSettings: registry("apiSettings"),
        globalSettings: registry("globalSettings"),
        plugins: registry("plugins"),
        keyBindings: registry("keyBindings"),
        rebuildSettings,
        globalStorage: registry("globalStorage"),
        apiStorage: registry("apiStorage"),
        tempStorage: registry("tempStorage"),
        persistApiSettings,
        setApiSetting
    }
}

/*
 * The content API controlls the content area of the API extender where the content from the API is loaded
 */
function registerContentApi({ registry, register, apiRef }) {
    register("treeBuilder", treeBuilder)
    register("lastStatus", null)
    register("lastAssignments", null)
    register("lastOverwriteHeaders", {})
    register("streamAbort", null)

    const extractCache = {}

    const getAssignments = (
        section,
        allAssignments,
        allDefaults,
        prompts,
        extracts,
        env
    ) => {
        const assignments = allAssignments[section] ?? {}
        const defaults = allDefaults[section] ?? {}
        const resolved = {}
        const resolveAssignment = (key, type, value, action) => {
            switch (action) {
                case ASSIGNMENT.ACTION.SET:
                    resolved[key] =
                        type === ASSIGNMENT.TYPE.JSON
                            ? getParsedJson(value)
                            : value
                    break

                case ASSIGNMENT.ACTION.CONST:
                    const constValue = apiRef.current.getConstValue(value, env)
                    if (constValue !== undefined) {
                        resolved[key] = constValue
                    }
                    break

                case ASSIGNMENT.ACTION.PROMPT:
                    if (prompts[value] === undefined) {
                        prompts[value] = { key, targets: [] }
                    }
                    prompts[value].targets.push(section)
                    break

                case ASSIGNMENT.ACTION.EXTRACT:
                    const { code, path, from, request } = getExtractParts(value)
                    const cachedValue = extractCache[value]
                    if (cachedValue !== undefined) {
                        resolved[key] = cachedValue
                        break
                    }
                    if (!extracts[request]) {
                        extracts[request] = {
                            expect: code,
                            extractions: {}
                        }
                    }
                    extracts[request].extractions[key] = [
                        value,
                        section,
                        from,
                        ...getParsedJson(path)
                    ]
                    break
            }
        }
        for (const [key, assignment] of Object.entries(assignments)) {
            const { action, type, assignmentValue } = assignment

            if (action === ASSIGNMENT.ACTION.DEFAULT) {
                const defaultValue = defaults[key]
                resolveAssignment(
                    key,
                    defaultValue.type,
                    defaultValue.assignmentValue,
                    defaultValue.action
                )
            } else {
                resolveAssignment(key, type, assignmentValue, action)
            }
        }
        for (const [key, assignment] of Object.entries(defaults)) {
            if (resolved[key] !== undefined) continue

            const { action, type, assignmentValue } = assignment
            resolveAssignment(key, type, assignmentValue, action)
        }
        return resolved
    }

    const getResolvedAssignments = (request, assignments = {}, env) => {
        const prompts = {}
        const extracts = {}

        const { method } = request

        const defaults = apiRef.current.getDefaults(request.defaults)
        const queryAssignments = getAssignments(
            "query",
            assignments,
            defaults,
            prompts,
            extracts,
            env
        )
        const headersAssignments = getAssignments(
            "headers",
            assignments,
            defaults,
            prompts,
            extracts,
            env
        )
        const hasBody = isMethodWithRequestBody(method)
        const bodyAssignments = !hasBody
            ? {}
            : getAssignments(
                  "body",
                  assignments,
                  defaults,
                  prompts,
                  extracts,
                  env
              )

        return {
            queryAssignments,
            headersAssignments,
            bodyAssignments,
            prompts,
            extracts,
            hasBody
        }
    }

    const getResolvedBody = (rawBody, inputMode, assignments, headers) => {
        const body = apiRef.current.getResolvedBodyForMode(inputMode, rawBody)
        if (!Object.keys(assignments).length) return body

        let contentType = ""
        for (const [key, value] of Object.entries(headers)) {
            if (key.toLocaleLowerCase() === "content-type") {
                contentType = value
                break
            }
        }
        if (!contentType.endsWith("/json")) return body

        const json = {}
        if (body !== "") {
            try {
                json = JSON.parse(body)
            } catch (e) {
                return body
            }
        }
        if (!isObject(json)) return body

        return JSON.stringify({
            ...json,
            ...assignments
        })
    }

    const assignAnswers = (promptEntries, values, headers, query, body) => {
        let i = 0
        while (i < promptEntries.length) {
            const [, assignments] = promptEntries[i]

            const value = values[i]
            const { key, targets } = assignments
            for (const target of targets) {
                if (target === "headers") {
                    headers[key] = value
                } else if (target === "query") {
                    query[key] = value
                } else if (target === "body") {
                    body[key] = value
                }
            }
            i++
        }
        return { headers, query, body }
    }

    const getResolvedUrlAndRequestObject = (
        request,
        resQuery,
        resHeaders,
        resBody,
        overwriteHeaders = {},
        env
    ) => {
        const query = getQueryStringForJson(resQuery)
        const { api, path, headers, body, inputMode, ...options } = request

        const baseUrl = apiRef.current.getApiUrl(api, env)
        if (!baseUrl) throw Error(`No API with id "${api}" was found!`)

        const [pathOnly, rawQuery] = path.split("?")
        let url =
            (baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length - 1)
                : baseUrl) + pathOnly

        const queryParts = []
        if (rawQuery) queryParts.push(rawQuery)
        if (query) queryParts.push(query)

        if (queryParts.length) {
            url += "?" + queryParts.join("&")
        }

        const finalHeaders = {
            ...resHeaders,
            ...overwriteHeaders
        }
        return {
            url,
            options: {
                headers: finalHeaders,
                query,
                body: !isMethodWithRequestBody(request.method)
                    ? undefined
                    : getResolvedBody(body, inputMode, resBody, finalHeaders),
                ...options
            }
        }
    }

    const startRequestProcessing = async (
        options,
        request,
        assignments,
        overwriteHeaders = {}
    ) => {
        const { tree = false, history = false, expect, env } = options
        const autoHeaders = {}

        const preprocessors = []
        const stages = []
        if (tree && request.responseStream) {
            stages.push(fixResponseAsTreeStream)
        } else if (request.response) {
            stages.push(fixResponseAsFullResponse)
        } else {
            preprocessors.push(promptInputsAndResolve)
            stages.push(extractValuesFromRequests, buildFetchUrlAndOptions)
            if (history) {
                stages.push(addRequestToHistory)
            }
            stages.push(startApiRequest)
            if (true) {
                stages.push(retryOnUnauthorized)
            }
            if (expect) {
                stages.push(assertExpectedResponseStatus)
            }
            // TODO check if external API is extended and connected
            const isApiExtended = request.api === APIS.OPTION.CURRENT
            if (!(tree && isApiExtended)) {
                stages.push(buildFullResponse)
            }
            if (tree) {
                if (isApiExtended) {
                    autoHeaders[apiRef.current.config.dumpHeader] = "cmd"
                    stages.push(fetchAsTreeStream)
                } else {
                    stages.push(fullResponseAsTreeStream)
                }
            }
        }
        return await startStageProcessing({
            request,
            assignments,
            overwriteHeaders: { ...overwriteHeaders, ...autoHeaders },
            env,
            expect,
            aborts: [],
            preprocessors,
            stages
        })
    }

    const startContentStream = (
        request,
        assignments,
        overwriteHeaders = {}
    ) => {
        const doRequest = async () => {
            register("lastRequest", request)
            register("lastAssignments", assignments)
            register("lastOverwriteHeaders", overwriteHeaders)
            register("lastStatus", null)

            const { treeBuilder, spinner } = registry()

            treeBuilder.reset()
            const treeNodeStream = await startRequestProcessing(
                { tree: true, history: true, expect: 200 },
                request,
                assignments,
                overwriteHeaders
            )
            register("streamAbort", treeNodeStream.abort)
            const promise = treeBuilder
                .processStream(treeNodeStream)
                .finally(() => {
                    register("lastStatus", treeNodeStream.op.status)
                    register("streamAbort", null)
                })
            spinner.start(
                promise,
                () => {
                    treeNodeStream.abort()
                    treeBuilder.abort()
                },
                treeNodeStream.statusRef
            )
        }
        requestAnimationFrame(doRequest)
    }

    const reloadContentStream = () => {
        const { lastRequest, lastAssignments } = registry()
        if (!lastRequest) return

        startContentStream(lastRequest, lastAssignments)
    }

    const restartContentStream = (overwrites) => {
        const { lastRequest, lastAssignments } = registry()
        if (!lastRequest) return

        startContentStream(lastRequest, lastAssignments, overwrites)
    }

    const retryContentStream = () => {
        const { lastRequest, lastAssignments, lastOverwriteHeaders } =
            registry()
        if (!lastRequest) return

        startContentStream(lastRequest, lastAssignments, lastOverwriteHeaders)
    }

    const fixResponseAsTreeStream = async (fetchOp) => {
        const { request } = fetchOp
        const responseStream = request.responseStream
        if (!responseStream) return

        const { status, lines, interval } = responseStream
        const stream = startAbortableArrayStream(lines, interval, status)
        fetchOp.result = stream.promise
        fetchOp.aborts.push(stream.abort)
        fetchOp.status = status
    }

    const fixResponseAsFullResponse = async (fetchOp) => {
        const { request } = fetchOp
        const response = request.response
        if (!response) return

        const { status = 200, body } = response
        fetchOp.result = {
            status,
            body: isString(body) ? body : JSON.stringify(body)
        }
    }

    const promptInputsAndResolve = async (fetchOp) => {
        const { request, assignments, env } = fetchOp
        const { openPrompt, closePrompt } = registry()
        const {
            prompts,
            extracts,
            queryAssignments,
            headersAssignments,
            bodyAssignments
        } = getResolvedAssignments(request, assignments, env)

        let promptEntries = Object.entries(prompts)
        const headers = {}
        const query = {}
        const body = {}
        if (promptEntries.length && rememberPrompts) {
            const newEntries = []
            const preEntries = []
            const preValues = []
            for (const item of promptEntries) {
                const answer = rememberAnswers[item[0]]
                if (answer) {
                    preEntries.push(item)
                    preValues.push(answer)
                } else {
                    newEntries.push(item)
                }
            }
            assignAnswers(preEntries, preValues, headers, query, body)
            promptEntries = newEntries
        }

        if (promptEntries.length) {
            const promise = new Promise((resolve, reject) => {
                openPrompt({
                    close: () => {
                        closePrompt()
                        reject(
                            new DOMException(
                                "The operation was aborted.",
                                "AbortError"
                            )
                        )
                    },
                    prompts: promptEntries,
                    assign: (values) => {
                        assignAnswers(
                            promptEntries,
                            values,
                            headers,
                            query,
                            body
                        )
                        resolve()
                        closePrompt()
                    }
                })
            })
            await promise
        }
        fetchOp.resolved = {
            headers: { ...headersAssignments, ...headers },
            query: { ...queryAssignments, ...query },
            body: { ...bodyAssignments, ...body }
        }
        fetchOp.extracts = Object.keys(extracts).length ? [extracts] : []
    }

    const getPathValue = (obj, path) => {
        if (!path.length) return obj

        const [key, ...subPath] = path

        const value = obj[key]

        if (value === undefined) return
        return getPathValue(value, subPath)
    }

    const extractValuesFromRequests = async (fetchOp, setStatus) => {
        const { extracts } = fetchOp
        if (!extracts.length) return

        setStatus("Fetching requests for Extraction")
        const requestExtracts = extracts.shift()
        const processingPromises = []
        const extractions = []
        const requestIds = []
        const requestIndex = apiRef.current.requestIndex

        for (const [requestId, details] of Object.entries(requestExtracts)) {
            const index = requestIndex.getEntityByPropValue("value", requestId)
            if (index === undefined) throw Error(`Invalid ... ${requestId}`)

            const { request, assignments } = requestIndex.getEntityObject(index)
            const processing = await fetchApiResponse(request, assignments, {
                expect: details.expect
            })
            extractions.push(details.extractions)
            processingPromises.push(processing.promise)
            fetchOp.aborts.push(processing.abort)
            requestIds.push(requestId)
        }

        const responses = await Promise.all(processingPromises)
        let i = 0
        while (i < responses.length) {
            const response = responses[i]
            const key2path = extractions[i]
            const requestName = apiRef.current.getRequestName(requestIds[i])
            for (const [key, path] of Object.entries(key2path)) {
                const [cacheKey, target, from, ...subPath] = path
                const failPrefix = `Extracting value for "${key}" from ${from} of request "${requestName}" failed:`
                let tree
                if (from === "body") {
                    const bodyType = response.bodyType
                    if (!isSupportedExtractBodyType(bodyType))
                        throw Error(
                            `${failPrefix} response body type is ${bodyType ?? "unknown"} which is not supported for extraction`
                        )

                    tree =
                        bodyType === "json"
                            ? getParsedJson(response.body)
                            : response.body
                } else if (from === "header") {
                    tree = response.headers
                } else if (from === "cookies") {
                    tree = response.cookies
                } else
                    throw Error(
                        `${failPrefix} unknown extract-from type "${from}" given`
                    )

                if (!tree)
                    throw Error(`${failPrefix} could parse response ${from}`)

                const extractedValue = getPathValue(tree, subPath)
                if (extractedValue === undefined)
                    throw Error(
                        `${failPrefix} could not find value for given path ${getExtractPathForString(JSON.stringify(subPath))}`
                    )

                extractCache[cacheKey] = extractedValue
                fetchOp.resolved[target][key] = extractedValue
            }
            i++
        }
        fetchOp.aborts = []
        if (extracts.length) {
            // fetchOp.stages.unshift(extractValuesFromRequests)
        }
    }

    const buildFetchUrlAndOptions = async (fetchOp, setStatus) => {
        const { request, resolved, overwriteHeaders, env } = fetchOp
        const { query, headers, body } = resolved

        const { url, options } = getResolvedUrlAndRequestObject(
            request,
            query,
            headers,
            body,
            overwriteHeaders,
            env
        )

        fetchOp.url = url
        fetchOp.options = options
    }

    const addRequestToHistory = async (fetchOp, setStatus) => {
        const historyEntryIndex = apiRef.current.historyEntryIndex
        const { request, assignments, options } = fetchOp
        let bodyType
        if (isMethodWithRequestBody(request.method)) {
            for (const [name, value] of Object.entries(options.headers ?? {})) {
                if (name.toLowerCase() !== "content-type") continue
                bodyType = value
                break
            }
        }
        historyEntryIndex.addFirst(request, assignments, bodyType)
    }

    const startApiRequest = async (fetchOp, setStatus) => {
        setStatus("Fetching API request...")
        const controller = new AbortController()
        fetchOp.aborts.push(() => {
            controller.abort()
        })
        fetchOp.result = await fetch(fetchOp.url, {
            ...fetchOp.options,
            signal: controller.signal
        })
    }

    const retryOnUnauthorized = async (fetchOp, setStatus) => {
        if (fetchOp.result.status !== 401) return

        d("SHOULD RETRY AFTER REQUEST...")
    }

    const assertExpectedResponseStatus = async (fetchOp, setStatus) => {
        const { expect } = fetchOp
        if (!expect) return

        if (fetchOp.result.status !== expect)
            throw Error(
                `Http response code mismatch. Expected ${expect} but got ${fetchOp.result.status}!`
            )
    }

    const buildFullResponse = async (fetchOp, setStatus) => {
        setStatus("Fetching body...")
        const { result, request } = fetchOp

        const response = {
            method: request.method,
            status: result.status,
            cookies: {}, // TODO send via backend
            headers: getJsonForApiResponseHeaders(result.headers, true) // TODO simple-flag dependant from api proxy-setting
        }
        if (isMethodWithResponseBody(request.method)) {
            response.bodyType = getBodyTypeFromResponseHeaders(result.headers)
            response.body = await result.text()
        }
        fetchOp.result = response
    }

    const fetchAsTreeStream = async (fetchOp, setStatus) => {
        const { result } = fetchOp

        fetchOp.result = result.body.getReader()
    }

    const fullResponseAsTreeStream = async (fetchOp, setStatus) => {
        const { result } = fetchOp
        const { method, headers, body, status } = result

        const contentType = headers["content-type"] ?? ""
        const [mime] = contentType.split(";")
        const hasBody = isMethodWithResponseBody(method)

        const lines = [{ cmd: CMD.OPEN_SECTION, name: "HttpRequest" }]
        if (hasBody) {
            lines.push({ cmd: CMD.OPEN_SECTION_DETAILS })
        }
        lines.push({
            cmd: CMD.ADD_CODE_BLOCK,
            name: "Http Header",
            content:
                "<pre>" +
                Object.entries(headers)
                    .map(([name, value]) => `${name}: ${value}`)
                    .join("\n") +
                "</pre>"
        })
        if (hasBody) {
            lines.push(
                { cmd: CMD.CLOSE_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Response",
                    tags: ["api.response"],
                    content: body,
                    mime,
                    footer: {
                        Status: status,
                        "Content-Type": contentType
                    },
                    isError: status >= 400
                }
            )
        }
        lines.push({ cmd: CMD.CLOSE_SECTION }, { cmd: CMD.END })
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            start(controller) {
                while (lines.length) {
                    let line = lines.shift()
                    controller.enqueue(
                        encoder.encode(
                            (isString(line) ? line : JSON.stringify(line)) +
                                "\n"
                        )
                    )
                }
                controller.close()
            },
            cancel() {
                clearInterval(timeout)
            }
        })
        fetchOp.status = 200
        fetchOp.result = stream.getReader()
    }

    const fetchApiResponse = async (request, assignments, options = {}) => {
        return await startRequestProcessing(
            { tree: false, history: false, ...options },
            request,
            assignments
        )
    }

    return {
        treeBuilder: registry("treeBuilder"),
        startContentStream,
        restartContentStream,
        reloadContentStream,
        retryContentStream,
        abortContentStream: () => {
            const { streamAbort } = registry()
            if (streamAbort) streamAbort()
        },
        haltContentStream: (hash) => {
            restartContentStream({ "Tls-Apixt-Halt": hash })
        },
        fetchApiResponse,
        getEnvContentPromise: async (env) => {
            const { lastRequest, lastAssignments } = registry()
            return await startRequestProcessing(
                { tree: false, history: false, env },
                lastRequest,
                lastAssignments
            )
        },
        clearContent: () => {
            const { treeBuilder } = registry()
            treeBuilder.reset()
        },
        getLastStatus: () => registry("lastStatus"),
        hasPromptAnswers: () => {
            return rememberPrompts && !!Object.keys(rememberAnswers).length
        },
        clearPromptAnswers: () => {
            rememberAnswers = {}
        }
    }
}

/*
 * The event API allows to register global listeners and also manages an exclusive mode which makes sure that
 * there are no side-effects while the mode is active
 */
function registerEventManagementApi({ registry, register }) {
    register("listeners", [])
    register("mode", null)

    const removeEventListener = (type) => {
        const { listeners } = registry()

        const handlers = listeners[type]
        if (!handlers || handlers.length === 0) {
            return
        }
        const last = handlers.pop()
        window.removeEventListener(type, last.handler, last.options)
        if (last.options.cleanUp) {
            last.options.cleanUp()
        }
    }

    const isInExclusiveMode = () => registry("mode") !== null

    const endExclusiveMode = (id) => {
        const { mode, listeners, setFixCursor } = registry()
        if (!id || mode !== id) {
            return
        }
        if (listeners) {
            for (let type of Object.keys(listeners)) {
                removeEventListener(type)
            }
        }
        register("mode", null)
        if (id.startsWith("mouse:")) {
            setFixCursor(null)
        }
    }

    return {
        startExclusiveMode: (id, cursor = "auto") => {
            const { mode, setFixCursor } = registry()
            if (mode !== null) {
                endExclusiveMode(mode)
            }
            register("mode", id)
            if (id.startsWith("mouse:")) {
                setFixCursor(cursor)
            }
        },
        isInExclusiveMode,
        endExclusiveMode,
        onExclusiveModeEnd: (callback) => {
            const check = () => {
                if (!isInExclusiveMode()) {
                    callback()
                } else {
                    requestAnimationFrame(check)
                }
            }
            check()
        },
        addEventListener: (type, listener, options = false) => {
            const { mode, listeners } = registry()

            if (!mode)
                throw Error(
                    `No call of start exclusive mode before addEventListener`
                )

            const handler = (event, ...params) => {
                let result = false
                try {
                    result = listener(event, ...params)
                } catch (e) {
                    console.error(
                        `An error occured in the event handler "${type}": ${e}`
                    )
                    endExclusiveMode(mode) // problems? get from registry
                }
                if (options.once) {
                    removeEventListener(type)
                }
                if (!options.propagate) {
                    event.stopPropagation()
                }
                return result
            }
            window.addEventListener(type, handler, options)
            if (!listeners[type]) {
                listeners[type] = []
            }
            listeners[type].push({ handler, options })
        },
        removeEventListener
    }
}

function registerConstantsApi({ registry }) {
    const { apiSettings } = registry()

    const constantIndex = new ConstantIndex(apiSettings.constants)
    const getConstName = (id) => {
        const index = constantIndex.getEntityByPropValue("value", id)
        return constantIndex.getEntityPropValue(index, "name")
    }
    const getConstValue = (id, env) => {
        const index = constantIndex.getEntityByPropValue("value", id)
        if (index === undefined) return

        const entity = constantIndex.getEntityObject(index)

        const { constValue, envValues } = entity
        if (!env) return constValue

        const envValue = envValues[env]

        return envValue !== undefined ? envValue : constValue
    }
    const getConstOptions = () => {
        const options = []
        const items = constantIndex.getEntityObjects()
        for (const { value, name } of items) {
            options.push({ id: value, name })
        }
        return options
    }
    const rebuildConstants = () => {
        const { apiSettings } = registry()
        constantIndex.setModel(apiSettings.constants)
    }
    return {
        constantIndex,
        getConstName,
        getConstValue,
        getConstOptions,
        rebuildConstants
    }
}

function registerRequestsApi({ registry, apiRef }) {
    const { apiSettings } = registry()
    const requestIndex = new RequestIndex(apiSettings.requests)
    requestIndex.addListener(() => {
        apiSettings.requests = requestIndex.model
        apiRef.current.persistApiSettings()
    })
    const getRequestOptions = () => {
        const items = requestIndex.getEntityObjects()
        const options = []
        for (const { name, value } of items) {
            options.push({ id: value, name })
        }
        return options
    }
    const getRequestName = (id) => {
        const index = requestIndex.getEntityByPropValue("value", id)
        if (index === undefined) return

        return requestIndex.getEntityPropValue(index, "name")
    }
    return {
        requestIndex,
        getRequestName,
        getRequestOptions
    }
}

function registerDefaultsApi({ registry, apiRef }) {
    const { apiSettings } = registry()
    const defaultsIndex = new RequestAssignmentsIndex(apiSettings.defaults)
    defaultsIndex.addListener(() => {
        apiSettings.defaults = defaultsIndex.model
        apiRef.current.persistApiSettings()
    })
    const getDefaultsOptions = () => {
        const items = defaultsIndex.getEntityObjects()
        const options = [{ id: "", name: "<None>" }]
        for (const { name, value } of items) {
            options.push({ id: value, name })
        }
        return options
    }
    const getDefaultsName = (id) => {
        const index = defaultsIndex.getEntityByPropValue("value", id)
        if (index === undefined) return

        return defaultsIndex.getEntityPropValue(index, "name")
    }
    const getDefaults = (id) => {
        const index = defaultsIndex.getEntityByPropValue("value", id)
        if (index === undefined) return {}

        return defaultsIndex.getEntityObject(index)
    }
    return {
        defaultsIndex,
        getDefaultsName,
        getDefaults,
        getDefaultsOptions
    }
}

function registerApiEnvApi({ registry, apiRef }) {
    const { apiSettings, config } = registry()
    const apiIndex = new ApiIndex(apiSettings.apis)
    apiIndex.addListener(() => {
        apiSettings.apis = apiIndex.model
        apiRef.current.persistApiSettings()
    })
    const apiEnvIndex = new ApiEnvIndex(apiSettings.apiEnvs)

    const getApiName = (id) => {
        if (id === APIS.OPTION.CURRENT) return "Current"

        const index = apiIndex.getEntityByPropValue("value", id)
        if (index === undefined) return

        return apiIndex.getEntityPropValue(index, "name")
    }
    const getApiUrl = (id, env) => {
        if (id === APIS.OPTION.CURRENT) {
            let url = config.baseUrl
            if (env) {
                const index = apiEnvIndex.getEntityByPropValue("value", env)
                if (index !== undefined)
                    url = apiEnvIndex.getEntityPropValue(index, "url")
            }
            return d(url)
        }
        const index = apiIndex.getEntityByPropValue("value", id)
        if (index === undefined) return

        let url = apiIndex.getEntityPropValue(index, "url")
        if (env) {
            const env2url = apiIndex.getEntityPropValue(index, "envValues")
            const envUrl = env2url[env]
            if (envUrl) url = envUrl
        }
        return url
    }
    const getApiOptions = (except = []) => {
        const options = [{ id: APIS.OPTION.CURRENT, name: "Current" }]
        const envs = apiIndex.getEntityObjects()
        for (const { value, name } of envs) {
            if (except.includes(value)) continue

            options.push({ id: value, name })
        }
        return options
    }
    const getApiEnvName = (id) => {
        const index = apiEnvIndex.getEntityByPropValue("value", id)
        if (index === undefined) return

        return apiEnvIndex.getEntityPropValue(index, "name")
    }
    const getApiEnvOptions = (except = []) => {
        const options = []
        const envs = apiEnvIndex.getEntityObjects()
        for (const { value, name } of envs) {
            if (except.includes(value)) continue

            options.push({ id: value, name })
        }
        return options
    }
    const rebuildApiEnvs = () => {
        const { apiSettings } = registry()
        apiEnvIndex.setModel(apiSettings.apiEnvs)
        apiIndex.setModel(apiSettings.apis)
    }

    return {
        apiIndex,
        getApiName,
        getApiUrl,
        getApiOptions,
        apiEnvIndex,
        getApiEnvName,
        getApiEnvOptions,
        getLastApiId: () => {
            return apiRef.current.apiSettings.lastApiId ?? APIS.OPTION.CURRENT
        },
        rebuildApiEnvs
    }
}

function registerHistoryApi({ registry, register }) {
    const { apiStorage, globalSettings } = registry()

    const historyEntryIndex = new HistoryEntryIndex(
        apiStorage.getJson("requestHistory", []),
        globalSettings.history
    )
    historyEntryIndex.addListener(() => {
        apiStorage.setJson("requestHistory", historyEntryIndex.model)
    })

    const getLastPathParams = (path) => {
        const pathInfo = getPathInfo(path)
        if (!pathInfo.varCount) return []

        const matchExpr = new RegExp(pathInfo.regexp)

        for (const { request } of historyEntryIndex.getEntityObjects()) {
            const matches = matchExpr.exec(request.path)
            if (matches === null) continue

            const result = []
            let i = 0
            while (i < pathInfo.varCount) {
                i++
                result.push(matches[i])
            }
            return result
        }
        return []
    }

    const getLastRouteMatch = (method, pathInfo) => {
        const matchExpr = new RegExp(pathInfo.regexp)

        for (const {
            request,
            assignments,
            bodyType
        } of historyEntryIndex.getEntityObjects()) {
            const matches = matchExpr.exec(request.path)
            if (matches !== null && request.method === method)
                return {
                    request,
                    assignments,
                    bodyType
                }
        }
    }
    return {
        historyEntryIndex,
        getLastPathParams,
        getLastRouteMatch
    }
}

function registerBodyModeApi({ apiRef }) {
    const id2mode = {
        raw: { name: "Raw" },
        json: {
            name: "JSON",
            isValid: (value) => {
                try {
                    const parsed = JSON.parse(value)
                    return parsed !== undefined
                } catch (e) {
                    return false
                }
            },
            format: (value) => {
                const { globalSettings } = apiRef.current
                const parsed = JSON.parse(value)
                return JSON.stringify(parsed, null, globalSettings.tabWidth)
            }
        }
    }
    const bodyType2modes = {
        json: ["json"],
        assign_json: ["json"]
    }

    const getModeOptionsForBodyType = (bodyType) => {
        const modes = bodyType.startsWith("assign_") ? [] : ["raw"]

        const extraModes = bodyType2modes[bodyType.toLowerCase()] ?? []
        modes.push(...extraModes)

        const options = []
        for (const id of modes) {
            const mode = id2mode[id]
            options.push({ id, name: mode.name })
        }
        return options
    }
    const doBodyConversion = (body, fromMode, toMode) => {
        const mode = id2mode[fromMode.toLowerCase()]
        if (!mode || !mode.convertTo) return body

        return mode.convertTo(body, toMode)
    }
    const getResolvedBodyForMode = (modeId, body) => {
        const mode = id2mode[modeId.toLowerCase()]
        if (!mode || !mode.targetMode) return body

        return doBodyConversion(body, modeId, mode.targetMode)
    }
    return {
        registerMode: (id, mode) => {
            id2mode[id] = mode
        },
        linkModeWithBodyType: (type, id) => {
            let links = bodyType2modes[type]
            if (!links) links[type] = []
            if (links.includes(id)) return

            links.push(id)
        },
        getModeOptionsForBodyType,
        isValidBody: (modeId, body, validator) => {
            const mode = id2mode[modeId.toLowerCase()]
            if (!mode) return true

            const isValidSyntax = mode.isValid && mode.isValid(body)
            if (!validator) return isValidSyntax

            return (
                isValidSyntax && validator(getResolvedBodyForMode(modeId, body))
            )
        },
        getFormatedBody: (modeId, body) => {
            const mode = id2mode[modeId.toLowerCase()]
            if (!mode || !mode.format) return body

            return mode.format(body)
        },
        hasBodyValidator: (modeId) => {
            const mode = id2mode[modeId.toLowerCase()]
            return !!(mode && mode.isValid)
        },
        getBodyModeName: (modeId) => {
            const mode = id2mode[modeId.toLowerCase()]
            return mode.name
        },
        hasBodyTypeMode: (bodyType, modeId) => {
            const available = getModeOptionsForBodyType(bodyType).map(
                (x) => x.id
            )
            return available.includes(modeId)
        },
        doBodyConversion,
        setLastBodyTypeMode: (bodyType, mode) => {
            const { apiSettings, setApiSetting } = apiRef.current
            const lastBodyTypeModes = apiSettings.lastBodyTypeModes
            lastBodyTypeModes[bodyType] = mode
            setApiSetting("lastBodyTypeModes", lastBodyTypeModes)
        },
        getLastBodyTypeMode: (bodyType) => {
            const { apiSettings } = apiRef.current
            const firstMode = (bodyType2modes[bodyType] ?? ["raw"])[0]
            return apiSettings.lastBodyTypeModes[bodyType] ?? firstMode
        },
        getResolvedBodyForMode
    }
}

function AppCtx({ config, children }) {
    const registryRef = useRef()
    const apiRef = useRef()
    const registry = (key = null) =>
        key ? registryRef.current[key] : registryRef.current

    const update = useComponentUpdate()

    if (!registry()) {
        const register = (key, value) => {
            registryRef.current[key] = value
        }

        registryRef.current = {
            updates: 0,
            config,
            version: "0.1.0",
            mode: null,
            confirm: null,
            lastRequest: null,
            dirty: false,
            spinner: null
        }

        const registration = { register, registry, apiRef, config }

        apiRef.current = {
            ...registerSettingsApi(registration),
            ...registerEventManagementApi(registration),
            ...registerRouteApi(registration),
            ...registerContentApi(registration),
            ...registerHistoryApi(registration),
            ...registerModalApi(registration),
            ...registerHotkeyApi(registration),
            ...registerConstantsApi(registration),
            ...registerApiEnvApi(registration),
            ...registerRequestsApi(registration),
            ...registerDefaultsApi(registration),
            ...registerBodyModeApi(registration),

            config: registry("config"),
            version: registry("version"),
            register,
            update: () => {
                apiRef.current = { ...apiRef.current }
                update()
            }
        }
        for (const plugin of PluginRegistry.getPlugins()) {
            plugin.registerContext(apiRef.current)
        }
        for (const plugin of PluginRegistry.getActivePlugins()) {
            plugin.activateInContext(apiRef.current)
        }
    }
    return (
        <AppContext.Provider value={apiRef.current}>
            <>
                <PromptDiv key="pd" />
                <SpinnerDiv key="sd" />
                <FixCursorArea key="em" />
                {children}
            </>
        </AppContext.Provider>
    )
}

export { AppContext, AppCtx }
