import { createContext, useState, useRef, useContext, useEffect } from "react"
import { treeBuilder } from "core/tree"
import {
    startAbortableApiRequestStream,
    startAbortableApiBodyRequest,
    isMethodWithRequestBody,
    getQueryStringForJson,
    getPathInfo
} from "core/http"
import { useComponentUpdate, useLoadingSpinner } from "./common"
import { d, getParsedJson, apply, isObject } from "core/helper"
import { PluginRegistry } from "core/plugin"
import {
    defaultApiSettings,
    defaultGlobalSettings,
    defaultKeyBindings
} from "./settings"
import { ASSIGNMENT } from "entities/assignments"
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

    const getAssignments = (
        section,
        allAssignments,
        allDefaults,
        prompts,
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
            env
        )
        const headersAssignments = getAssignments(
            "headers",
            assignments,
            defaults,
            prompts,
            env
        )
        const hasBody = isMethodWithRequestBody(method)
        const bodyAssignments = !hasBody
            ? {}
            : getAssignments("body", assignments, defaults, prompts, env)

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

    const doRequest = (fireRequest, request, assignments, env) => {
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
                    prompts: promptEntries,
                    assign: (values) => {
                        assignAnswers(
                            promptEntries,
                            values,
                            headers,
                            query,
                            body
                        )
                        resolve(
                            fireRequest(
                                { ...headersAssignments, ...headers },
                                { ...queryAssignments, ...query },
                                { ...bodyAssignments, ...body }
                            )
                        )
                        closePrompt()
                    }
                })
            })
            return promise
        } else {
            return fireRequest(
                { ...headersAssignments, ...headers },
                { ...queryAssignments, ...query },
                { ...bodyAssignments, ...body }
            )
        }
    }

    const getResolvedRequestObject = (
        request,
        resQuery,
        resHeaders,
        resBody,
        overwriteHeaders = {}
    ) => {
        const query = getQueryStringForJson(resQuery)
        const { headers, body, inputMode, ...options } = request

        const finalHeaders = {
            ...resHeaders,
            ...overwriteHeaders
        }
        return {
            headers: finalHeaders,
            query,
            body: !isMethodWithRequestBody(request.method)
                ? undefined
                : getResolvedBody(body, inputMode, resBody, finalHeaders),
            ...options
        }
    }

    const startContentStream = (
        request,
        assignments,
        overwriteHeaders = {}
    ) => {
        register("lastRequest", request)
        register("lastAssignments", assignments)
        register("lastOverwriteHeaders", overwriteHeaders)
        register("lastStatus", null)

        const { treeBuilder, spinner, config } = registry()
        const historyEntryIndex = apiRef.current.historyEntryIndex
        const isCurrentApi = request.api === APIS.OPTION.CURRENT

        const fireRequest = (resHeaders, resQuery, resBody) => {
            const options = getResolvedRequestObject(
                request,
                resQuery,
                resHeaders,
                resBody,
                {
                    ...overwriteHeaders,
                    [config.dumpHeader]: isCurrentApi ? "cmd" : undefined
                }
            )
            let bodyType
            if (isMethodWithRequestBody(request.method)) {
                for (const [name, value] of Object.entries(
                    options.headers ?? {}
                )) {
                    if (name.toLowerCase() !== "content-type") continue
                    bodyType = value
                    break
                }
            }
            historyEntryIndex.addFirst(request, assignments, bodyType)
            treeBuilder.reset()

            const httpStream = startAbortableApiRequestStream(
                isCurrentApi
                    ? config.baseUrl
                    : apiRef.current.getApiUrl(request.api),
                options
            )

            register("streamAbort", httpStream.abort)
            const promise = treeBuilder
                .processStream(httpStream)
                .finally(() => {
                    register("lastStatus", httpStream.status)
                    register("streamAbort", null)
                })
            spinner.start(promise, () => {
                httpStream.abort()
                treeBuilder.abort()
            })
        }
        doRequest(fireRequest, request, assignments)
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
            restartContentStream({ headers: { "Tls-Apixt-Halt": hash } })
        },
        fetchApiResponse: (request, assignments) => {
            const { api } = request
            const { getApiUrl } = apiRef.current

            const fireRequest = (resHeaders, resQuery, resBody) => {
                const options = getResolvedRequestObject(
                    request,
                    resQuery,
                    resHeaders,
                    resBody
                )

                const url = getApiUrl(api)
                const httpStream = startAbortableApiBodyRequest(url, {
                    ...options,
                    expect: () => true
                })
                return httpStream
            }

            return doRequest(fireRequest, request, assignments)
        },
        getEnvContentPromise: (env) => {
            const { lastRequest, lastAssignments } = registry()

            const { apiEnvIndex } = apiRef.current
            const index = apiEnvIndex.getEntityByPropValue("value", env)
            if (index === undefined)
                throw Error(`The environment does not exist any more`)

            const { url, name } = apiEnvIndex.getEntityObject(index)

            const fireRequest = (resHeaders, resQuery, resBody) => {
                const options = getResolvedRequestObject(
                    lastRequest,
                    resQuery,
                    resHeaders,
                    resBody
                )

                const httpStream = startAbortableApiBodyRequest(url, {
                    ...options,
                    expect: () => true
                })
                return httpStream
            }
            return doRequest(fireRequest, lastRequest, lastAssignments)
        },
        clearContent: () => {
            const { treeBuilder } = registry()
            treeBuilder.reset()
        },
        getLastStatus: () => registry("lastStatus"),
        // getBaseHeaderIndex: () => registry("baseHeaderIndex"),
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
    const { apiSettings } = registry()
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
    const getApiUrl = (id) => {
        const index = apiIndex.getEntityByPropValue("value", id)
        if (index === undefined) return

        return apiIndex.getEntityPropValue(index, "url")
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
