import { createPortal } from "react-dom"
import { useContext, useRef, useState, useEffect } from "react"
import { AppContext } from "./context"
import { Block } from "./layout"
import { Button } from "./form"
import { extractFullClasses } from "../core/helper"
import { useMounted } from "./common"
import { d } from "../core/helper"

const isEventInRect = (e, rect) => {
    return (
        rect.x <= e.clientX &&
        rect.x + rect.width >= e.clientX &&
        rect.y <= e.clientY &&
        rect.y + rect.height >= e.clientY
    )
}

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
    const [shadow, setShadow] = useState(null)
    const mounted = useMounted()

    const enableShadow = () => {
        setTimeout(() => {
            if (mounted.current) {
                setShadow(true)
            }
        }, 100)
    }
    const cacheRef = useRef(false)
    if (id && !cacheRef.current) {
        aContext.pushModalId(id)
        aContext.loadPageCache(id)
        cacheRef.current = true
    }
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
        /*
        focusElem.top = trapRef.current
        const elems = trapRef.current.querySelectorAll(".tabbed")
        focusElem.start = elems ? elems[0] : null
        */
    })

    useEffect(() => {
        const focusElem = aContext.focusStack.elem[zIndex]
        if (!focusElem || !focusElem.start) {
            return
        }
        requestAnimationFrame(() => {
            const elem = trapRef.current
                ? trapRef.current.querySelector(".tabbed.autofocus")
                : null
            if (elem) {
                elem.focus()
            } else {
                focusElem.start.focus()
            }
        })
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
            requestAnimationFrame(() => {
                const rect = dimRef.current.getBoundingClientRect()
                setDim(rect)
                setLeft(rect.left)
                setTop(rect.top)
            })
            return () => {
                observer.disconnect()
            }
        }
    }, [])

    useEffect(() => {
        if (transparent) {
            const focusElem = aContext.focusStack.elem[zIndex]
            if (focusElem) {
                focusElem.setShadow = enableShadow
            }
            enableShadow()
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
              close()
              e.stopPropagation()
              e.preventDefault()
          }
        : null

    const hDivCls = ["place-self-center"]
    const fullCls = extractFullClasses(className)
    if (fullCls.length) {
        hDivCls.push(fullCls.join(" "))
    }
    if (!transparent) {
        hDivCls.push("overflow-hidden")
    }
    if (!maxWidth) {
        maxWidth = "100%"
    } else {
        if (typeof maxWidth === "number") {
            maxWidth = maxWidth + "px"
        }
        maxWidth = "min(" + maxWidth + ", 100%)"
    }
    const hDivStyle = {
        maxWidth,
        minWidth,
        width
    }
    if (!maxHeight) {
        maxHeight = "100%"
    } else {
        if (typeof maxHeight === "number") {
            maxHeight = maxHeight + "px"
        }
        maxHeight = "min(" + maxHeight + ", 100%)"
    }
    const vDivStyle = {
        maxHeight,
        height,
        zIndex
    }
    const parentDivStyle = {
        width: "calc(100% - 50px)",
        height: "calc(100% - 50px)"
    }

    const vDivCls = [
        "stack-v overflow-hidden h-full border border-header-border text-app bg-app-bg text-ms divide-y divide-header-border modal-centered"
    ]
    if (className) {
        vDivCls.push(className)
    }
    const dimAttr = {}
    if (transparent && shadow !== null) {
        vDivCls.push(shadow ? "" : /* "fix-") + */ "shadow-xl")
        const modalLevel = aContext.getModalLevel()
        dimAttr.onMouseEnter = (e) => setShadow(false)
        dimAttr.onMouseLeave = (e) => {
            if (aContext.getModalLevel() !== modalLevel) {
                setShadow(false)
                return
            }
            const rect = dimRef.current.getBoundingClientRect()
            if (!isEventInRect(e, rect)) {
                setShadow(true)
            } else if (aContext.isInExclusiveMode()) {
                window.addEventListener(
                    "mouseup",
                    (e) => {
                        if (!isEventInRect(e, rect)) {
                            setShadow(true)
                        }
                    },
                    { once: true }
                )
                setShadow(false)
            }
        }
    }
    const hotKeys = {}
    if (closeable) {
        hotKeys.close = close
    }
    const overlayCls = ["full fixed left-0 top-0"]
    if (!transparent) {
        overlayCls.push("bg-overlay-bg")
    }

    const nameAttr = {}
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
        vDivStyle.left = left
        vDivStyle.top = top
        vDivStyle.position = "fixed"
        vDivStyle.width = dim.width
        vDivStyle.maxWidth = null
        vDivStyle.minWidth = null
        vDivStyle.height = dim.height
        vDivStyle.maxHeight = null
        vDivStyle.minHeight = null
    }
    /*
    useHotKeys(dimRef,         {
        ...hotKeys,
        submit: {
            exec: () => {
                const submit = wContext.getModalSubmit();
                if (submit) submit()
            }
        }
    }, 1);
    */

    //             onLeftClick={(e) => e.stopPropagation()}   aus erstem Block

    return (
        <Block
            ref={trapRef}
            className={overlayCls.join(" ")}
            onClick={onClick}
            zIndex={zIndex - 1}
        >
            <div className="grid h-full w-full editor-bounds">
                <div className="place-self-center grid" style={parentDivStyle}>
                    <div className={hDivCls.join(" ")} style={hDivStyle}>
                        <div
                            ref={dimRef}
                            {...dimAttr}
                            className={vDivCls.join(" ")}
                            style={vDivStyle}
                        >
                            <Block className="stack-h bg-header-bg text-header w-full">
                                <Block
                                    className="w-full px-2 text-ellipsis"
                                    {...nameAttr}
                                >
                                    {name}
                                </Block>
                                {closeable ? (
                                    <Button
                                        name="X"
                                        icon="close"
                                        onClick={(e) => close()}
                                    />
                                ) : (
                                    ""
                                )}
                            </Block>
                            {children}
                        </div>
                    </div>
                </div>
            </div>
            <Block
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
        </Block>
    )
}

function Modal({ ...props }) {
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

    const close = () => {
        if (propsRef.current && propsRef.current.cleanUp) {
            propsRef.current.cleanUp()
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
