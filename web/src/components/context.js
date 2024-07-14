import { createContext, useState, useRef } from "react"

const AppContext = createContext(null)

function AppCtx({ children }) {
    const [storage] = useState(() => {
        return null // new BrowserStorage(localStorage, "tyrolite.apixt.")
    })

    const registryRef = useRef()
    const registry = (key = null) =>
        key ? registryRef.current[key] : registryRef.current

    if (!registry()) {
        const register = (key, value) => {
            registryRef.current[key] = value
        }
        const getModalLevel = () => registry("modalStack").length

        registryRef.current = {
            lastTarget: null,
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
            }
        }
    }
    return (
        <AppContext.Provider value={registryRef.current}>
            {children}
        </AppContext.Provider>
    )
}

export { AppContext, AppCtx }
