import { createPortal } from "react-dom"
import { useContext, useRef, useState, useEffect } from "react"
import { AppContext } from "./context"
import { Div } from "./layout"
import { Button } from "./form"
import { d, Attributes } from "core/helper"
import { useMounted, useHotKeys } from "./common"
import { ClassNames } from "../core/helper"
import themeManager from "core/theme"

function ModalWindow({
    id,
    name,
    trapRef,
    close,
    closeable = true,
    zIndex = 0,
    transparent,
    width,
    maxWidth,
    minWidth,
    height,
    maxHeight,
    drag,
    className,
    children
}) {
    const aContext = useContext(AppContext)

    const dimRef = useRef(null)
    const [left, setLeft] = useState(null)
    const [top, setTop] = useState(null)
    const [dim, setDim] = useState(null)
    const mounted = useMounted()

    useEffect(() => {
        if (!id) return
        return () => {
            aContext.popModalId(id)
        }
    })

    useEffect(() => {
        const focusElem = aContext.focusStack.elem[zIndex]
        if (!focusElem) {
            return
        }
        focusElem.top = trapRef.current
        focusElem.start = trapRef.current.querySelector(".tabbed")
        if (!focusElem.auto)
            focusElem.auto = trapRef.current.querySelector(".tabbed.autofocus")
    })

    const doAutoFocus = () => {
        const focusElem = aContext.focusStack.elem[zIndex]
        if (!focusElem || !focusElem.start) {
            return
        }
        const elem = trapRef.current
            ? trapRef.current.querySelector(".tabbed.autofocus")
            : null
        if (elem) {
            elem.focus()
            if (["INPUT", "TEXTAREA"].includes(elem.tagName)) {
                elem.select()
            }
        } else {
            focusElem.start.focus()
        }
    }

    useEffect(() => {
        requestAnimationFrame(doAutoFocus)
    }, [])

    useEffect(() => {
        if (drag) {
            const observer = new ResizeObserver((entries) => {
                const rect = dimRef.current.getBoundingClientRect()
                const dim = entries[0].contentRect

                const spaceX = dim.width - rect.width
                const spaceY = dim.height - rect.height

                let newPosX = null
                let newPosY = null
                if (rect.x < 0 || dim.width < rect.x + rect.width) {
                    newPosX =
                        spaceX < 0
                            ? 0
                            : Math.round(dim.width / 2 - rect.width / 2)
                }
                if (rect.y < 0 || dim.height < rect.y + rect.height) {
                    newPosY =
                        spaceY < 0
                            ? 0
                            : Math.round(dim.height / 2 - rect.height / 2)
                }

                if (newPosX !== null) {
                    setLeft(newPosX)
                }
                if (newPosY !== null) {
                    setTop(newPosY)
                }
            })
            observer.observe(document.body)
            setTimeout(() => {
                const rect = dimRef.current.getBoundingClientRect()
                setDim(rect)
                setLeft(rect.left)
                setTop(rect.top)
                requestAnimationFrame(doAutoFocus)
            }, 100)
            return () => {
                observer.disconnect()
            }
        }
    }, [])

    const onClick = closeable
        ? (e) => {
              let target = e.target
              while (target.classList !== undefined) {
                  if (target.classList.contains("modal-centered")) {
                      return
                  }
                  target = target.parentNode
              }
              close("click-outside")
              e.stopPropagation()
              e.preventDefault()
          }
        : null

    if (!maxWidth) {
        maxWidth = "100%"
    } else {
        if (typeof maxWidth === "number") {
            maxWidth = maxWidth + "px"
        }
        maxWidth = "min(" + maxWidth + ", 100%)"
    }
    const widthAttr = Attributes()
    widthAttr.setStyles({
        maxWidth,
        minWidth,
        width
    })
    if (!maxHeight) {
        maxHeight = "100%"
    } else {
        if (typeof maxHeight === "number") {
            maxHeight = maxHeight + "px"
        }
        maxHeight = "min(" + maxHeight + ", 100%)"
    }
    const heightAttr = Attributes()
    heightAttr.setStyles({
        maxHeight,
        height,
        zIndex
    })

    const modalCls = new ClassNames(
        "stack-v overflow-hidden border border-header-border text-app-text bg-app-bg text-ms modal-centered divide-y divide-header-border",
        className
    )
    modalCls.addIf(transparent, "shadow-xl")

    const overlayCls = new ClassNames("full fixed left-0 top-0")
    overlayCls.addIf(!transparent, "bg-overlay-bg/50")

    const nameAttr = Attributes()
    if (drag) {
        nameAttr.cursor = "grab"
        nameAttr.onMouseDown = (e) => {
            const rect = dimRef.current.getBoundingClientRect()
            const dim = document.body.getBoundingClientRect()

            const anchorPos = { x: e.clientX, y: e.clientY }
            let lastPosX = anchorPos.x
            let lastPosY = anchorPos.y
            const minLeft = -rect.width / 2
            const maxLeft = Math.max(dim.width - rect.width / 2, 0)
            const minTop = 0
            const maxTop = Math.max(dim.height - rect.height / 2, 0)
            const offX = lastPosX - rect.x
            const offY = lastPosY - rect.y
            aContext.startExclusiveMode("modal-drag", "grabbing")
            aContext.addEventListener("mousemove", (e) => {
                const relPos = {
                    x: e.clientX - anchorPos.x,
                    y: e.clientY - anchorPos.y
                }
                if (relPos.x !== lastPosX || relPos.y !== lastPosY) {
                    lastPosX = relPos.x
                    setLeft(
                        Math.min(Math.max(e.clientX - offX, minLeft), maxLeft)
                    )
                    lastPosY = relPos.y
                    setTop(Math.min(Math.max(e.clientY - offY, minTop), maxTop))
                }
            })
            aContext.addEventListener(
                "mouseup",
                () => {
                    aContext.endExclusiveMode("modal-drag")
                },
                { once: true }
            )
            e.stopPropagation()
            e.preventDefault()
        }
    }

    if (dim !== null) {
        widthAttr.setStyles({
            left,
            top,
            position: "fixed",
            width: dim.width,
            height: dim.height,
            minWidth: null,
            maxWidth: null
        })
    }

    const hotKeys = {}
    if (closeable) {
        hotKeys.close = close
    }
    useHotKeys(
        dimRef,
        {
            ...hotKeys,
            submit: {
                exec: () => {
                    const submit = aContext.getModalSubmit()
                    if (submit) submit()
                }
            }
        },
        1
    )
    const airbagSize = "50px"
    return (
        <Div
            ref={trapRef}
            className={overlayCls.value}
            onClick={onClick}
            zIndex={zIndex - 1}
        >
            <div className="stack-v h-full overflow-hidden editor-bounds">
                <Div className="shrink" height={airbagSize}></Div>

                <Div className="auto overflow-hidden" {...heightAttr.props}>
                    <Div className="stack-h full py-2 overflow-hidden">
                        <Div className="shrink" width={airbagSize}></Div>

                        <div className="stack-v h-full auto px-2 justify-center items-center overflow-y-hidden min-w-min">
                            <Div
                                className={modalCls.value}
                                {...widthAttr.props}
                                ref={dimRef}
                            >
                                <Div className="stack-h bg-header-bg text-header-text w-full">
                                    <Div
                                        className="w-full px-2 text-ellipsis"
                                        {...nameAttr.props}
                                    >
                                        {name}
                                    </Div>
                                    {closeable ? (
                                        <Button
                                            icon="close"
                                            onPressed={(e) =>
                                                close("click-button")
                                            }
                                        />
                                    ) : (
                                        ""
                                    )}
                                </Div>

                                <div
                                    className="grid auto overflow-hidden"
                                    style={{
                                        gridTemplateColumns: "100%",
                                        gridTemplateRows: "100%"
                                    }}
                                >
                                    {children}
                                </div>
                            </Div>
                        </div>

                        <Div className="shrink" width={airbagSize}></Div>
                    </Div>
                </Div>

                <Div className="shrink" height={airbagSize}></Div>
            </div>
            <Div
                width={0}
                height={0}
                tab
                onFocus={() => {
                    const focusElem = aContext.focusStack.elem[zIndex]
                    if (focusElem && focusElem.start) {
                        focusElem.start.focus()
                    }
                }}
            />
        </Div>
    )
}

function Modal({ isolated, ...props }) {
    const trapRef = useRef(null)
    const aContext = useContext(AppContext)
    /*
    if (wContext.isStyleLocked()) {
        // const lockedStyles = wContext.getLockedStyles()
        return (
            <Portal id="modals-container">
                <ThemeFreeze blockRef={trapRef} values={lockedStyles}>
                    <ModalInner
                        trapRef={trapRef}
                        lockedStyles={lockedStyles}
                        {...props}
                    />
                </ThemeFreeze>
            </Portal>
        )
    }
    */
    useEffect(() => {
        if (!isolated) return

        themeManager.applyBackup(trapRef.current)
        return () => themeManager.deleteBackup()
    }, [])

    return createPortal(
        <ModalWindow trapRef={trapRef} {...props} />,
        document.getElementById("modals")
    )
}

function useModalWindow() {
    const context = useContext(AppContext)
    const [isOpen, setIsOpen] = useState(false)
    const propsRef = useRef(null)
    const currRef = useRef(null)
    const openedRef = useRef(0)
    currRef.current = isOpen

    const close = (source) => {
        if (propsRef.current && propsRef.current.cleanUp) {
            propsRef.current.cleanUp(source)
        }
        propsRef.current = null
        context.closeModal(currRef.current)
        setIsOpen(false)
    }
    const open = (props = {}) => {
        openedRef.current++
        propsRef.current = props
        setIsOpen(context.openModal())
    }
    const content = function ({
        id,
        full,
        width,
        maxWidth,
        minWidth,
        height,
        maxHeight,
        minHeight,
        transparent,
        className,
        drag,
        ...props
    }) {
        const title =
            propsRef.current && propsRef.current.title
                ? propsRef.current.title
                : props.name
        const dimProps = {
            full,
            width,
            height,
            maxWidth,
            minWidth,
            maxHeight,
            minHeight
        }
        dimProps.zIndex = isOpen
        if (!id && propsRef.current && propsRef.current.id) {
            id = propsRef.current.id
        }
        return (
            <>
                {isOpen && (
                    <Modal
                        id={id}
                        key={openedRef.current}
                        close={close}
                        name={title}
                        drag={drag}
                        className={className}
                        transparent={transparent}
                        closeable={props.closeable}
                        isolated={props.isolated}
                        {...dimProps}
                    >
                        {props.children}
                    </Modal>
                )}
            </>
        )
    }
    return {
        content,
        open,
        close,
        get props() {
            const props = propsRef.current === null ? {} : propsRef.current
            return props.close ? props : { ...props, close }
        }
    }
}

export { useModalWindow }
