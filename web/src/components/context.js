import { createContext, useState, useRef, useContext, useEffect } from "react"
import { BrowserStorage } from "../core/storage"
import { treeBuilder } from "../core/tree"
import { getHttpStreamPromise } from "../core/http"
import { useComponentUpdate, useLoadingSpinner } from "./common"
import { d } from "../core/helper"

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
    const aCtx = useContext(AppContext)
    const LoadingSpinner = useLoadingSpinner()
    useEffect(() => {
        aCtx.register("spinner", LoadingSpinner)
    }, [])

    return <>{LoadingSpinner.Modal}</>
}

function AppCtx({ config, children }) {
    const [storage] = useState(() => {
        return BrowserStorage(localStorage, "tyrolite.apixt.")
    })

    const update = useComponentUpdate()
    const registryRef = useRef()
    const registry = (key = null) =>
        key ? registryRef.current[key] : registryRef.current

    if (!registry()) {
        const register = (key, value) => {
            registryRef.current[key] = value
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

        registryRef.current = {
            register,
            update: () => {
                registryRef.current = { ...registry() }
                update()
            },
            updates: 0,
            config,
            treeBuilder,
            version: "0.1.0",
            mode: null,
            confirm: null,
            settings: null,
            lastRequest: null,
            dirty: false,
            spinner: null,
            storage,
            startContentStream: (request) => {
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
            },
            restartContentStream: (overwrites = {}) => {
                const { lastRequest, startContentStream } = registry()
                if (!lastRequest) return

                const { headers, ...options } = lastRequest
                let addHeaders = {}
                if (headers && overwrites.headers) {
                    addHeaders = {
                        headers: { ...headers, ...overwrites.headers }
                    }
                }
                startContentStream({ ...options, ...overwrites, ...addHeaders })
            },
            abortContentStream: () => {
                const { streamAbort } = registry()
                if (streamAbort) streamAbort()
            },
            haltContentStream: (hash) => {
                const { restartContentStream } = registry()
                restartContentStream({ headers: { "Tls-Apixt-Halt": hash } })
            },
            clearContent: () => {
                const { treeBuilder } = registry()
                treeBuilder.reset()
            },
            lastTarget: null,
            listeners: {},
            buttonRefocus: null,
            focusStack: {
                elem: {},
                zIndex: null
            },
            modalStack: [],
            modalIds: [],
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
        <AppContext.Provider value={registryRef.current}>
            <>
                <SpinnerDiv key="sd" />
                <FixCursorArea key="em" />
                {children}
            </>
        </AppContext.Provider>
    )
}

export { AppContext, AppCtx }
