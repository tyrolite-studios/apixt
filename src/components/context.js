import {
    createContext,
    useState,
    useRef,
    useMemo,
    useContext,
    useEffect
} from "react"
import { treeBuilder } from "core/tree"
import { getHttpStreamPromise } from "core/http"
import { useComponentUpdate, useLoadingSpinner } from "./common"
import { d } from "core/helper"
import { HOOKS, PluginRegistry } from "../core/plugin"

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

const defaultSettings = {
    tabSpaces: 4,
    mapping: {
        undo: "m z",
        redo: "m y",
        save: "m s",
        export: "m x",
        new: "c n",
        select: null,
        delete: "c d",
        toggle: "c t",
        quit: "c q",
        edit: "m e",
        all: "c a",
        pick: "c p",
        play: "m p",
        submit: "Enter",
        close: "Escape"
    }
}

function AppCtx({ config, children }) {
    const globalStorage = useMemo(() => {
        return controller ? controller.globalStorage : null
    }, [])
    const apiStorage = useMemo(() => {
        return controller ? controller.apiStorage : null
    }, [])
    const tempStorage = useMemo(() => {
        return controller ? controller.tempStorage : null
    }, [])
    const [settings, setSettingsRaw] = useState(() => {
        if (!globalStorage) return
        return globalStorage.getJson("settings", {
            ...defaultSettings,
            plugins: PluginRegistry.getDefaultStates()
        })
    })
    const setSettings = (settings) => {
        globalStorage.setJson("settings", settings)
        setSettingsRaw(settings)
    }
    useEffect(() => {
        if (!globalStorage) return
        PluginRegistry.setStates(settings.plugins)
        requestAnimationFrame(() => PluginRegistry.updateApp())
    }, [])

    const update = useComponentUpdate()
    const registryRef = useRef()
    const setterRef = useRef()
    const registry = (key = null) =>
        key ? registryRef.current[key] : registryRef.current

    if (!registry()) {
        const register = (key, value) => {
            registryRef.current[key] = value
        }

        const action2hotKey = defaultSettings.mapping
        /*
        storage.getDefaultedJson(
            "hotkeys",
            defaultMapping
        )*/
        const hotKey2action = {}
        for (let [action, key] of Object.entries(action2hotKey)) {
            if (key !== null) {
                hotKey2action[key] = action
            }
        }

        const getModalLevel = () => registry("modalStack").length

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
            setFixCursor(null)
        }

        const getHotKeyArea = (area) => {
            const { elemKeyBindings } = registry()

            const currLevel = getModalLevel()
            for (let item of elemKeyBindings) {
                if (currLevel === item[3] && item[2] == area) {
                    return item[0]
                }
            }
            return null
        }

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

        const clearSettings = () => {
            globalStorage.deleteJson("settings")
        }

        const getHandlerForAction = (
            action,
            elem,
            followLinks = true,
            passed = false
        ) => {
            const { elemKeyBindings } = registry()

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

        const startContentStream = (request) => {
            PluginRegistry.applyHooks(HOOKS.FETCH_CONTENT, request)

            const { treeBuilder, spinner, config } = registry()
            treeBuilder.reset()

            register("lastRequest", request)
            const httpStream = getHttpStreamPromise(config, request)
            register("streamAbort", httpStream.abort)
            const promise = treeBuilder
                .processStream(httpStream)
                .finally(() => register("streamAbort", null))

            spinner.start(promise, () => {
                httpStream.abort()
                treeBuilder.abort()
            })
        }

        const restartContentStream = (overwrites = {}) => {
            const { lastRequest } = registry()
            if (!lastRequest) return

            const { headers, ...options } = lastRequest
            let addHeaders = {}
            if (headers && overwrites.headers) {
                addHeaders = {
                    headers: { ...headers, ...overwrites.headers }
                }
            }
            startContentStream({ ...options, ...overwrites, ...addHeaders })
        }

        registryRef.current = {
            updates: 0,
            config,
            treeBuilder,
            version: "0.1.0",
            mode: null,
            confirm: null,
            settings,
            lastRequest: null,
            dirty: false,
            spinner: null,
            globalStorage,
            apiStorage,
            tempStorage,
            lastTarget: null,
            listeners: {},
            buttonRefocus: null,
            focusStack: {
                elem: {},
                zIndex: null
            },
            modalStack: [],
            modalIds: [],

            hotKeyActions: {
                action2hotKey,
                hotKey2action
            },
            elemKeyBindings: []
        }

        setterRef.current = {
            config: registry("config"),
            treeBuilder: registry("treeBuilder"),
            focusStack: registry("focusStack"),
            register,
            update: () => {
                setterRef.current = { ...setterRef.current }
                update()
            },
            globalStorage: registry("globalStorage"),
            apiStorage: registry("apiStorage"),
            tempStorage: registry("tempStorage"),
            startContentStream,
            restartContentStream,
            abortContentStream: () => {
                const { streamAbort } = registry()
                if (streamAbort) streamAbort()
            },
            haltContentStream: (hash) => {
                restartContentStream({ headers: { "Tls-Apixt-Halt": hash } })
            },
            clearContent: () => {
                const { treeBuilder } = registry()
                treeBuilder.reset()
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

            startExclusiveMode: (id, cursor = "auto") => {
                const { mode, setFixCursor } = registry()
                if (mode !== null) {
                    endExclusiveMode(mode)
                }
                register("mode", id)
                setFixCursor(cursor)
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

            addElemKeyBinding: (
                elem,
                action2handlers = {},
                area = null,
                link = null
            ) => {
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

            hotKeyActions: registry("hotKeyActions"),
            getLastTarget: () => registry("lastTarget"),

            settings: registry("settings"),
            setSettings,
            clearSettings,

            setButtonRefocus: (value) => {
                register("buttonRefocus", value)
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
    return (
        <AppContext.Provider value={setterRef.current}>
            <>
                <SpinnerDiv key="sd" />
                <FixCursorArea key="em" />
                {children}
            </>
        </AppContext.Provider>
    )
}

export { AppContext, AppCtx }
