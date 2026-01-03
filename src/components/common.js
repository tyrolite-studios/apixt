import {
    useRef,
    useState,
    useEffect,
    useContext,
    useMemo,
    createContext
} from "react"
import { useModalWindow } from "./modal"
import {
    ClassNames,
    isValidJson,
    getParsedJson,
    isObject,
    isArray,
    getSimpleType
} from "core/helper"
import {
    Button,
    ButtonGroup,
    AutoCompleteInput,
    Radio,
    Textarea,
    Input,
    FormContext,
    SelectCells,
    CustomCells,
    FormGrid, Select
} from "./form"
import { Centered, Div, Stack, Icon, OkCancelLayout } from "./layout"
import { AppContext } from "./context"
import { getExtractPathForString } from "entities/assignments"
import { PreBlockContent } from "./content"
import {
    Attributes,
    isBool,
    isFunction,
    getChildrenWithClass,
    AxisHandler,
    isInt
} from "../core/helper"

function useComponentUpdate() {
    const mounted = useMounted()
    const [updates, setUpdates] = useState(false)
    const updateRef = useRef(null)
    updateRef.current = updates
    return () => {
        requestAnimationFrame(() => {
            if (mounted.current) {
                setUpdates(!updateRef.current)
            }
        })
    }
}

function useMounted() {
    const mounted = useRef(false)
    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    })
    return mounted
}

function useDebugMount(name) {
    useEffect(() => {
        if (!name) return
        d("MOUNTING", name)
        return () => {
            d("UNMOUNTING", name)
        }
    }, [])
}

function useMarkInvalid(cls, invalid) {
    const fContext = useContext(FormContext)
    const callAfterwards = useCallAfterwards()

    cls.addIf(invalid, "invalid")
    if (invalid && fContext) {
        callAfterwards(fContext.markInvalid)
    }
}

const useGetTabIndex = ({ tab, tabControlled, focused }, cls) => {
    if (tab && cls) {
        cls.add("tabbed")
    }
    if ((tabControlled && tab) || (!tabControlled && focused) || tab) return 0

    return tab === false ? -1 : undefined
}

function getCols(name) {
    const [main, opacity = ''] = name.split('/')
    let bg
    let color;

    switch (main) {
        case 'transparent':
            bg = 'transparent'
            color = 'text-header-text'
            break

        case 'input':
            color = 'text-input-text'
            switch (opacity) {
                case '100':
                case '':
                    bg = 'bg-input-bg'
                    break

                case '0':
                    bg = 'bg-transparent'
                    color = 'text-input-text'
                    break

                case '25':
                    bg = 'bg-input-bg/25'
                    break

                case '50':
                    bg = 'bg-input-bg/50'
                    break

                case '75':
                    bg = 'bg-input-bg/75'
                    break
            }
            break

        case 'block':
            color = 'text-block-text'
            switch (opacity) {
                case '100':
                case '':
                    bg = 'bg-block-bg'
                    break

                case '0':
                    bg = 'bg-transparent'
                    color = 'text-block-text'
                    break

                case '25':
                    bg = 'bg-block-bg/25'
                    break

                case '50':
                    bg = 'bg-block-bg/50'
                    break

                case '75':
                    bg = 'bg-block-bg/75'
                    break
            }
            break

        case 'button':
            color = 'text-button-text'
            switch (opacity) {
                case '100':
                case '':
                    bg = 'bg-button-bg'
                    break

                case '0':
                    bg = 'bg-transparent'
                    color = 'text-button-text'
                    break

                case '25':
                    bg = 'bg-button-bg/25'
                    break

                case '50':
                    bg = 'bg-button-bg/50'
                    break

                case '75':
                    bg = 'bg-button-bg/75'
                    break
            }
            break

        case 'header':
            color = 'text-header-text'
            switch (opacity) {
                case '100':
                case '':
                    bg = 'bg-header-bg'
                    break

                case '0':
                    bg = 'bg-transparent'
                    color = 'text-header-text'
                    break

                case '25':
                    bg = 'bg-header-bg/25'
                    break

                case '50':
                    bg = 'bg-header-bg/50'
                    break

                case '75':
                    bg = 'bg-header-bg/75'
                    break
            }
            break

        case 'border':
            color = 'text-border-text'
            switch (opacity) {
                case '100':
                case '':
                    bg = 'bg-border-bg'
                    break

                case '0':
                    bg = 'bg-transparent'
                    color = 'text-border-text'
                    break

                case '25':
                    bg = 'bg-border-bg/25'
                    break

                case '50':
                    bg = 'bg-border-bg/50'
                    break

                case '75':
                    bg = 'bg-border-bg/75'
                    break
            }
            break


    }
    if (!bg || !color) throw Error(`Invalid color value "${name}" given!`)

    if (opacity === '0') color = 'text-app-text'
    return {
        bg,
        color
    }
}

function useExtractDimProps(
    { width, minWidth, maxWidth, height, minHeight, maxHeight },
    style = {}
) {
    if (width) {
        style.width = width
    }
    if (minWidth) {
        style.minWidth = maxWidth ? `min(${minWidth}, ${maxWidth})` : minWidth
    }
    if (maxWidth) {
        style.maxWidth = minWidth ? `max(${minWidth}, ${maxWidth})` : maxWidth
    }
    if (height) {
        style.height = height
    }
    if (minHeight) {
        style.minHeight = maxHeight
            ? `min(${minHeight}, ${maxHeight})`
            : minHeight
    }
    if (maxHeight) {
        style.maxHeight = minHeight
            ? `max(${minHeight}, ${maxHeight})`
            : maxHeight
    }
    return style
}

function useGetAttrWithDimProps({
    width,
    minWidth,
    maxWidth,
    height,
    minHeight,
    maxHeight,
    ...attr
}) {
    const style = attr.style ? { ...attr.style } : {}
    if (width) {
        style.width = width
    }
    if (minWidth) {
        style.minWidth = maxWidth ? `min(${minWidth}, ${maxWidth})` : minWidth
    }
    if (maxWidth) {
        style.maxWidth = minWidth ? `max(${minWidth}, ${maxWidth})` : maxWidth
    }
    if (height) {
        style.height = height
    }
    if (minHeight) {
        style.minHeight = maxHeight
            ? `min(${minHeight}, ${maxHeight})`
            : minHeight
    }
    if (maxHeight) {
        style.maxHeight = minHeight
            ? `max(${minHeight}, ${maxHeight})`
            : maxHeight
    }
    attr.style = style

    return attr
}

function useGetNewAttrWithDimProps({
                                       width,
                                       minWidth,
                                       maxWidth,
                                       height,
                                       minHeight,
                                       maxHeight,

                                   }) {
    const style = {}
    if (width) {
        style.width = width
    }
    if (minWidth) {
        style.minWidth = maxWidth ? `min(${minWidth}, ${maxWidth})` : minWidth
    }
    if (maxWidth) {
        style.maxWidth = minWidth ? `max(${minWidth}, ${maxWidth})` : maxWidth
    }
    if (height) {
        style.height = height
    }
    if (minHeight) {
        style.minHeight = maxHeight
            ? `min(${minHeight}, ${maxHeight})`
            : minHeight
    }
    if (maxHeight) {
        style.maxHeight = minHeight
            ? `max(${minHeight}, ${maxHeight})`
            : maxHeight
    }
    const attr = new Attributes()
    return attr.setStyles(style)
}


function useRegisterAppListeners() {
    const aContext = useContext(AppContext)

    const onFocus = (e) => {
        aContext.register("lastTarget", e.target)
        const zIndex = aContext.focusStack.zIndex
        if (!zIndex) {
            return
        }
        const focusElem = aContext.focusStack.elem[zIndex]
        if (!focusElem || !focusElem.top) {
            return
        }
        if (focusElem.top.contains(document.activeElement)) {
            return
        }
        if (focusElem.auto) {
            focusElem.auto.focus()
        } else {
            focusElem.start.focus()
        }
    }

    useEffect(() => {
        const hotkeyListener = (e) => {
            const actionKey = aContext.getHotkeyFromEvent(e)
            /*
            if (aContext.isInExclusiveMode()) {
                // TODO allow certain hotkeys?
                return
            }
            let hotKey = ""
            let actionKey = ""
            const isTextArea =
                document.activeElement &&
                "TEXTAREA" === document.activeElement.tagName
            const isInput =
                document.activeElement &&
                "INPUT" === document.activeElement.tagName

            if (e.metaKey) {
                hotKey += "m"
            } else if (e.ctrlKey) {
                hotKey += "c"
            } else if (e.altKey) {
                hotKey += "a"
            } else if (
                HotKeySingleKeys.includes(e.key) &&
                !(e.key === "Enter" && isTextArea)
            ) {
                actionKey = e.key
            } else if (
                e.key >= "0" &&
                e.key <= "9" &&
                !(isTextArea || isInput)
            ) {
                if (aContext.focusHotKeyArea(e.key)) {
                    e.stopPropagation()
                    e.preventDefault()
                    return
                }
            }
            if (hotKey.length > 0 && e.shiftKey) {
                hotKey += "i"
            }
            if (hotKey !== "") {
                actionKey = hotKey
                if (!HotKeySkipValues.includes(e.key)) {
                    actionKey += " " + e.key
                }
            }

             */
            if (!actionKey) {
                return
            }
            const elem =
                document.activeElement === document.body
                    ? aContext.getLastTarget()
                    : document.activeElement
            const handler = aContext.getHandlerForActionKey(actionKey, elem)
            if (handler) {
                if (!e.repeat) {
                    if (typeof handler === "object") {
                        if (!handler.can || handler.can()) {
                            handler.exec()
                        }
                    } else {
                        handler()
                    }
                }
                e.stopPropagation()
                e.preventDefault()
            } else if (handler === null && actionKey === "Escape") {
                e.stopPropagation()
                e.preventDefault()
                // TODO: confirm()
            }
        }
        const clickListener = (e) => {
            aContext.register("lastTarget", e.target)
        }
        window.addEventListener("mousedown", clickListener, {})
        window.addEventListener("keydown", hotkeyListener, {})
        return () => {
            window.removeEventListener("mousedown", clickListener, {})
            window.removeEventListener("keydown", hotkeyListener, {})
        }
    })

    return onFocus
}


function useHotKeys(elemRef, hotKeys, area = null, link = null) {
    const aContext = useContext(AppContext)
    const isHot = !!(area || (hotKeys && Object.keys(hotKeys).length > 0))
    useEffect(() => {
        if (!isHot) {
            return
        }
        aContext.addElemKeyBinding(elemRef.current, hotKeys, area, link)
        return () => {
            aContext.deleteElemKeyBindings(elemRef.current)
        }
    })
    return isHot
}

function useCallAfterwards() {
    const items = []
    useEffect(() => {
        while (items.length) {
            const [setter, ...value] = items.pop()
            setter(...value)
        }
    })
    return (setter, ...value) => {
        items.push([setter, ...value])
    }
}

function useItemContainer({
    items,
    count,
    parent,
    viewStart = 0,
    viewEnd = (items ? items.length : count) - 1,
    item2value = (x) => x,
    value2item = (x) => x
}) {
    const mounted = useMounted()
    const ref = useRef(null)
    const attr = Attributes({ ref })
    const naviRef = useRef(null)

    if (items) count = items.length

    const itemBuilders = []
    const addItemBuilder = (builder) => itemBuilders.push(builder)

    const getItem = (index) => {
        const item = { index, attr: Attributes() }
        for (const builder of itemBuilders) {
            builder(index, item)
        }
        return item
    }
    const viewCount = viewEnd - viewStart + 1
    naviRef.current =
        parent ? parent.naviRef.current : KeyNavigation()

    return {
        ref,
        attr,
        parent,
        naviRef,
        items,
        getItemIndexForViewIndex: x => x + viewStart,
        getViewIndexForItemIndex: x => x - viewStart,
        count,
        viewStart,
        viewEnd,
        viewCount,
        item2value,
        value2item,
        isMounted: () => ref.current && mounted.current,
        addItemBuilder,
        getItem
    }
}

function usePickerOnItemContainer({ container, pick }) {
    const pickIndex = (index) => {
        pick(container.item2value(container.items[index]), index)
    }
    container.attr.addListeners({
        onKeyDown: (e) => {
            if (!container.focused) return

            if (e.key === " ") {
                pickIndex(container.getItemIndexForViewIndex(container.tabIndex))
                e.preventDefault()
            }
        }
    })

    container.addItemBuilder((index, item) => {
        item.attr.addListener("onClick", (e) => {
            pickIndex(index)
        })
    })
}


const FOCUS_EVENTS = {
    X_PREV: 1,
    X_NEXT: 2,
    X_FIRST: 3,
    X_LAST: 4,
    Y_PREV: 5,
    Y_NEXT: 6,
    Y_FIRST: 7,
    Y_LAST: 8,
    Y_NEXT_BLOCK: 9,
    Y_PREV_BLOCK: 10,
    Y_NEXT_PAGE: 11,
    Y_PREV_PAGE: 12,
    ITEM_ACTION: 13
}

const defaultKeyToEvent = {
    'Home': FOCUS_EVENTS.Y_FIRST,
    'End': FOCUS_EVENTS.Y_LAST,
    'ArrowUp': FOCUS_EVENTS.Y_PREV,
    'ArrowDown': FOCUS_EVENTS.Y_NEXT,
    'ArrowLeft': FOCUS_EVENTS.X_PREV,
    'ArrowRight': FOCUS_EVENTS.X_NEXT,
    'PageDown': FOCUS_EVENTS.Y_NEXT_PAGE,
    'PageUp': FOCUS_EVENTS.Y_PREV_PAGE,
    'ArrowUp Shift': FOCUS_EVENTS.Y_PREV_BLOCK,
    'ArrowDown Shift': FOCUS_EVENTS.Y_NEXT_BLOCK,
    ' ': true
}

const KeyNavigation = () => {

    const keyToEvent = {}
    for (const [ key, event] of Object.entries(defaultKeyToEvent)) {
        keyToEvent[key] = [event, 50]
    }

    const axisHandler = [null, null]
    let isKeyPressed = false

    function getHandler(index) {
        let handler = axisHandler[index]
        if (index === 1) {
            if (handler === null) handler = axisHandler[0]
        }
        if (!handler) throw Error(`No axis handler registered yet`)

        return handler
    }
    const trigger = event => {
        switch (event) {
            case FOCUS_EVENTS.X_FIRST:
                getHandler(0).setValue(0)
                break

            case FOCUS_EVENTS.X_LAST:
                const xHandler = getHandler(0)
                xHandler.setValue(xHandler.getLastIndex())
                break

            case FOCUS_EVENTS.X_NEXT:
                getHandler(0).moveBy(1)
                break

            case FOCUS_EVENTS.X_PREV:
                getHandler(0).moveBy(-1)
                break

            case FOCUS_EVENTS.Y_NEXT:
                getHandler(1).moveBy(1)
                break

            case FOCUS_EVENTS.Y_NEXT_BLOCK:
                getHandler(1).moveBy(10)
                break

            case FOCUS_EVENTS.Y_PREV:
                getHandler(1).moveBy(-1)
                break

            case FOCUS_EVENTS.Y_PREV_BLOCK:
                getHandler(1).moveBy(-10)
                break

            case FOCUS_EVENTS.Y_FIRST:
                getHandler(1).setValue(0)
                break

            case FOCUS_EVENTS.Y_LAST:
                const yHandler = getHandler(1)
                yHandler.setValue(yHandler.getLastIndex())
                break
        }
    }
    const api = {
        addAxisHandler: (index, handler) => {
            axisHandler[index] = handler
        },
        trigger,
        getFocusIndex: (index) => {
            return getHandler(index).getFocusIndex()
        },
        setFocusIndex: (index, value) => {
            return getHandler(index).setFocusIndex(value)
        },
        isKeyPressed: () => isKeyPressed,
        setKeyEvents: (keyToHandler, prio) => {
            for (const [ key, handler ] of Object.entries(keyToHandler)) {
                const event = keyToEvent[key]
                if (!event) throw Error(`Unknown key event "${key}" given in setKeyEvents()`)

                if (!event || prio < event[1]) continue

                keyToEvent[key] = [handler, prio]
            }
        },
        handleKeyDown: (e) => {
            const event = keyToEvent[e.key + (e.shiftKey ? ' Shift' : '')]
            if (event !== true) {
                if (!event) return false

                let [ eventId ] = event
                if (isFunction(eventId)) {
                    const index = getHandler(1).getFocusIndex()
                    eventId = eventId(index)
                }
                if (isInt(eventId)) {
                    trigger(eventId)
                }
            }
            isKeyPressed = true
            return true
        },
        handleKeyUp: (e) => {
            isKeyPressed = false
        }
    }
    return api
}


const FocusRowContext = createContext(null)

function FocusRowCtx({ children }) {
    const [row, setRowRaw] = useState(0)
    const setRow = (value) => setRowRaw(value)
    const [ lastTabIndex, setLastTabIndex ] = useState(0)
    const rowTabIndexSetter = useRef(null)
    const containerRef = useRef(null)
    const markedTabRef = useRef(0)

    const refocus = () => {
        requestAnimationFrame(() => {
            const elems = containerRef.current.querySelectorAll(".tabbed")
            if (elems.length) {
                elems[elems.length - 1].focus()
            }
        })
    }

    const api = {
        row,
        lastTabIndex,
        setRowTabIndexSetter: setter => rowTabIndexSetter.current = setter,
        setRowTabIndex: (index) => {
            if (!rowTabIndexSetter.current) return

            rowTabIndexSetter.current(index)
        },
        setLastTabIndex,
        setMarkedTabIndex: (index) => {
            markedTabRef.current = index
        },
        getMarkedTabIndex: () => markedTabRef.current,
        nextRow: () => {
            const max = getChildrenWithClass(containerRef.current, 'item').length
            setRow(row + 1 >= max ? 0 : row + 1)
            refocus()
        },
        prevRow: () => {
            setRow(
                row === 0 ? getChildrenWithClass(containerRef.current, 'item').length - 1 : row - 1
            )
            refocus()
        },
        refocus,
        setRow,
        initContainer: (container, count) => {
            container.naviRef.current.addAxisHandler(1, AxisHandler(
                () => {
                return {
                    focusIndex: row,
                    setFocusIndex: (newRow) => {
                        setRow(newRow)
                        refocus()
                    },
                    pageIndexStart: container.viewStart,
                    pageIndexEnd: container.viewEnd,
                    viewToFocusIndex: container.viewToFocusIndex,
                    viewCount: count,
                    overflow: container.overflow
                }
            }))
        },
        setContainer: (container) => {
            containerRef.current = container
        }
    }

    return (
        <FocusRowContext.Provider value={api}>
            {children}
        </FocusRowContext.Provider>
    )
}

function useFocusGroupsOnItemContainer({ container, count }) {
    const aContext = useContext(AppContext)
    const frContext = useContext(FocusRowContext)

    const initCatchRef = useRef(false)
    const initFocusMinRef = useRef(true)
    const levelRef = useRef(null)
    if (levelRef.current === null) {
        levelRef.current = aContext.getModalLevel()
    }
    container.attr.addListeners({
        onMouseDown: (e) => {
            initFocusMinRef.current = false
        },
        onFocus: (e) => {
            if (initCatchRef.current) {
                cancelAnimationFrame(initCatchRef.current)
            }
            if (initFocusMinRef.current) {
                let minSelected = 0

                // if we have a selection then set the focus on the first item which is
                // included in the selection
                if (container.selection && container.selection.length) {
                    while (
                        minSelected < container.viewCount &&
                        !container.selection.includes(
                            container.item2value(container.items[container.getItemIndexForViewIndex(minSelected)])
                        )) {
                        minSelected++
                    }
                    // no item was found, so we select the first one
                    if (minSelected >= container.viewCount) minSelected = 0

                    const markedTabIndex = frContext.getMarkedTabIndex();
                    frContext.setLastTabIndex(markedTabIndex)
                    frContext.setRow(minSelected)
                    if (minSelected > 0) {
                        frContext.refocus()
                    } else {
                        requestAnimationFrame(() => {
                            frContext.setRowTabIndex(markedTabIndex)
                        })
                    }
                }
            }
            initFocusMinRef.current = false
            initCatchRef.current = false
        },
        onBlur: (e) => {
            if (initCatchRef.current) return

            initCatchRef.current = requestAnimationFrame(() => {
                initCatchRef.current = false

                if (!container.isMounted() || aContext.getModalLevel() !== levelRef.current) return

                initFocusMinRef.current = true
                frContext.setRow(0)
                frContext.setLastTabIndex(0)
            })
        }
    }, 'focus')
    useEffect(() => {
        frContext.setContainer(container.ref.current)
    }, [])
    container.refocus = frContext.refocus
    container.row = frContext.row
    frContext.initContainer(container, count)
}

function useFocusOnItemContainer({
    container,
    rowIndex,
    markedTabIndex = 0,
    cursor = true,
    count
}) {
    const aContext = useContext(AppContext)
    let frContext = useContext(FocusRowContext)

    if (rowIndex === undefined) frContext = undefined
    if (frContext) frContext.setMarkedTabIndex(markedTabIndex)

    const callAfterwards = useCallAfterwards()

    const [focused, setFocused] = useState(false)
    const [catchFocus, setCatchFocus] = useState(true)
    const [tabIndex, setTabIndexRaw] = useState(0)
    const setTabIndex = (index) => {
        setTabIndexRaw(index)
        if (frContext) {
            frContext.setLastTabIndex(index)
        }
        refocus()
    }
    const initCatchRef = useRef(false)
    const minSelectRef = useRef(0)
    const levelRef = useRef(null)
    if (levelRef.current === null) {
        levelRef.current = aContext.getModalLevel()
    }
    const { ref, viewCount, naviRef } = container
    if (!container.parent || (container.parent && focused)) {
        naviRef.current.addAxisHandler(
            0,
            AxisHandler(() => {
                return {
                    overflow: container.overflow,
                    focusIndex: tabIndex,
                    setFocusIndex: setTabIndex,
                    viewCount: count === undefined ? viewCount : count,
                    pageIndexStart: container.viewStart,
                    pageIndexEnd: container.viewEnd,
                    viewToFocusIndex: container.viewToFocusIndex
                }
            }
        ))
    }

    const refocus = () => {
        requestAnimationFrame(() => {
            if (!container.isMounted()) {
                if (frContext) frContext.prevRow()
                return
            }

            const elems = ref.current.querySelectorAll(".tabbed")
            if (elems.length) {
                const elem = elems[elems.length - 1]
                if (document.activeElement !== elem) {
                    elem.focus()
                }
                setCatchFocus(false)
            }
        })
    }
    // current tab index exceeds limit? then reset to last index
    if (tabIndex !== null && viewCount > 0 && tabIndex >= viewCount && !catchFocus) {
        callAfterwards(() => {
            setTabIndex(viewCount - 1)
        })
    }

    const handleCatchedFocus = (e) => {
        if (!container.isMounted()) return

        // the catcher got the focus, so we can disable the focus catching
        // because from now on, we will move the focus within the container
        setCatchFocus(false)
        let minSelected = 0
        // if we have a selection then set the focus on the first item which is
        // included in the selection
        if (frContext) {
            minSelected = frContext.lastTabIndex
            frContext.setRowTabIndexSetter(
                (index) => {
                    requestAnimationFrame(() => setTabIndex(index))
                }
            )
        } else if (container.selection && container.selection.length) {
            while (
                minSelected < container.viewCount &&
                !container.selection.includes(
                    container.item2value(container.items[container.getItemIndexForViewIndex(minSelected)])
                )
            ) {
                minSelected++
            }
            // no item was found, so we select the first one
            if (minSelected >= container.viewCount) minSelected = 0
        }
        const newTabIndex = minSelected
        minSelectRef.current = minSelected

        // the newly calculated tabIndex might differ from the last
        // so set it and move the focus to it
        setTabIndex(newTabIndex)
    }
    container.attr.addListeners({
        onFocus: (e) => {
            // that means we don't have to enable the focus catcher element
            initCatchRef.current = false
            // an element within the container has the focus
            setFocused(true)
        },
        onBlur: (e) => {
            // no element within the container has the focus
            setFocused(false)
            // a modal was opened while the container had focus
            // keep tab on current element because it gets focused on model close
            if (aContext.getModalLevel() !== levelRef.current) return

            // the container should enable focus catcher element...
            initCatchRef.current = true
            // ...but only if the blur was not directly followed by a focus
            requestAnimationFrame(() => {
                // container destroyed then exit
                if (!container.isMounted()) return

                // container didn't get focus in the meantime?
                if (initCatchRef.current) {
                    // enable focus catcher
                    setCatchFocus(true)
                    // this triggers a re-render where one of the container elements
                    // will get a tabIndex and act as a focus catcher
                }
                // no more checking for setting a focus catcher
                initCatchRef.current = false
            })
        },
        onKeyDown: (e) => {
            if (container.parent || !naviRef.current.handleKeyDown(e)) return

            e.preventDefault()
        },
        onKeyUp: (e) => {
            naviRef.current.handleKeyUp(e)
        }
    }, 'focus')
    const isTabRow = !frContext || frContext.row === rowIndex

    container.addItemBuilder((itemIndex, item) => {
        item.isFocused = container.getItemIndexForViewIndex(tabIndex) === itemIndex
        const refMin = frContext ? frContext.lastTabIndex : minSelectRef.current
        const viewIndex = container.getViewIndexForItemIndex(itemIndex)
        const isCatcher =
            catchFocus &&
            viewIndex ===
                (!refMin ||
                refMin >= container.viewCount
                    ? 0
                    : refMin)
        item.attr.add(
            "tab",
            isTabRow && ((item.isFocused && !catchFocus) || isCatcher)
        )
        item.attr.addListener("onMouseDown", (e) => {
            if (!container.isMounted()) return

            setTabIndex(viewIndex)
            setCatchFocus(false)
            if (frContext) {
                frContext.setRow(rowIndex)
            }
        })
        if (isTabRow && isCatcher) {
            item.attr.addListener("onFocus", handleCatchedFocus)
        }
        if (cursor) {
            if ((isBool(cursor) && cursor) || (isFunction(cursor) && cursor(itemIndex))) {
                item.attr.setStyle("cursor", "pointer")
            }
        }
    })

    container.focused = focused
    container.refocus = refocus
    container.tabIndex = tabIndex
    container.setTabIndex = setTabIndex
}

function DualRing({ size = 48, className }) {
    const cls = new ClassNames("lds-dual-ring", className)
    cls.addIf(size <= 20, "after:border", "after:border-4")
    return (
        <Div
            width={size + "px"}
            height={size + "px"}
            className={cls.value}
        ></Div>
    )
}

function LoadingSpinner({ abort, statusRef, close }) {
    const [status, setStatus] = useState(statusRef?.status ?? "Loading...")
    if (statusRef) {
        statusRef.setStatus = setStatus
    }
    return (
        <div className="stack-v gaps-1 p-4 text-center">
            <div className="px-4 py-2">{status}</div>

            <div>
                <DualRing />
            </div>

            <div>
                <Button
                    name="Abort"
                    onPressed={() => {
                        abort()
                    }}
                />
            </div>
        </div>
    )
}

function useLoadingSpinner() {
    const SpinnerWindow = useModalWindow()
    const [open, setOpen] = useState(false)
    const openRef = useRef()
    openRef.current = open

    return {
        start: (promise, abort, statusRef) => {
            setOpen(true)
            SpinnerWindow.open({
                abort,
                statusRef,
                cleanUp: (source) => {
                    if (source) abort()
                }
            })
            return promise.finally(() => {
                if (openRef.current) {
                    SpinnerWindow.close()
                    setOpen(false)
                }
            })
        },
        close: () => {
            if (!openRef.current) return

            SpinnerWindow.close()
            setOpen(false)
        },
        Modal: (
            <SpinnerWindow.content width="250px">
                <LoadingSpinner {...SpinnerWindow.props} />
            </SpinnerWindow.content>
        )
    }
}

function ConfirmDialog({ close, ok, msg }) {
    return (
        <OkCancelLayout submit cancel={close} ok={() => ok()}>
            <Div className="p-4 full text-center">
                <div className="stack-h gap-2 justify-center h-full">
                    <div className="place-self-center">
                        <Icon
                            name="warning"
                            className="text-2xl p-1 bg-warning-bg text-warning-text border-warning-text border"
                        />
                    </div>
                    <div className="text-xs text-center place-self-center">
                        {msg}
                    </div>
                </div>
            </Div>
        </OkCancelLayout>
    )
}

function useConfirmation() {
    const ConfirmModal = useModalWindow()
    return {
        open: ({ confirmed, ...props }) =>
            ConfirmModal.open({
                ...props,
                ok: () => {
                    ConfirmModal.close()
                    confirmed()
                }
            }),
        Modals: (
            <ConfirmModal.content name="Please confirm" width="300px">
                <ConfirmDialog {...ConfirmModal.props} />
            </ConfirmModal.content>
        )
    }
}

function ErrorDialog({ message, title = "An error occured:", close }) {
    return (
        <OkCancelLayout ok={() => close()} cancel={() => close()}>
            <div className="p-2 bg-warning-bg text-warning-text">
                <div className="stack-v gap-2 items-center">
                    <div className="opacity-75 text-xs">{title}</div>
                    <div className="text-xs">{message}</div>
                </div>
            </div>
        </OkCancelLayout>
    )
}

function useErrorWindow() {
    const ErrorModal = useModalWindow()
    return {
        open: ({ ...props }) => {
            ErrorModal.open({
                ...props,
                ok: () => {
                    ErrorModal.close()
                }
            })
        },
        Modal: (
            <ErrorModal.content width="300px">
                <ErrorDialog {...ErrorModal.props} />
            </ErrorModal.content>
        )
    }
}

function HighlightKeys({ obj }) {
    const keys = Object.keys(obj)
    return (
        <div>
            {keys.map((key, index) => (
                <span key={index}>
                    <span className="opacity-50">{key}: </span>
                    {obj[key].value}
                    {index === keys.length - 1 ? " " : ", "}
                </span>
            ))}
        </div>
    )
}

function HighlightMatches({ text, search, className }) {
    const parts = splitByMatch(text, search)
    return (
        <span>
            {parts.map((part, index) =>
                part.toLowerCase() === search.toLowerCase() ? (
                    <span key={index} className={className}>
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </span>
    )
}

const emptyValue = "<Enter Value>"

const KeyValueEditor = ({ object, sendObjectToParent }) => {
    const [editingValue, setEditingValue] = useState(null)

    const handleDeleteKey = (key) => {
        const updatedKeys = { ...object.values }
        delete updatedKeys[key]
        sendObjectToParent({
            suggestions: object.suggestions,
            values: updatedKeys
        })
    }

    const addNewKey = (value) => {
        if (value.trim() !== "" && !object.values.hasOwnProperty(value)) {
            const updatedKeys = { ...object.values }
            updatedKeys[value] = { value: emptyValue, type: "string" }
            sendObjectToParent({
                suggestions: object.suggestions,
                values: updatedKeys
            })
        }
    }

    const editKey = (key, newKey) => {
        setEditingValue(null)
        if (key === newKey) return
        const updatedObject = { ...object }
        updatedObject.values[newKey] = updatedObject.values[key]
        delete updatedObject.values[key]
        sendObjectToParent(updatedObject)
    }

    const editValue = (key, value) => {
        const updatedObject = { ...object }
        updatedObject.values[key] = {
            suggestions: updatedObject.values[key].suggestions,
            type: updatedObject.values[key].type,
            value
        }
        setEditingValue(null)
        sendObjectToParent(updatedObject)
    }

    return (
        <div className="bg-gray-700 p-2 rounded text-sm">
            {Object.entries(object.values).map(
                ([key, { value, type, suggestions }]) => (
                    <div
                        key={key}
                        className="text-white flex justify-between items-center"
                    >
                        {editingValue === key ? (
                            object.suggestions ? (
                                <AutoCompleteInput
                                    defaultValue={key}
                                    suggestions={object.suggestions}
                                    onClose={(newKey) => editKey(key, newKey)}
                                />
                            ) : (
                                <input
                                    type="text"
                                    defaultValue={key}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.target.blur()
                                        }
                                    }}
                                    onBlur={(e) => editKey(key, e.target.value)}
                                />
                            )
                        ) : (
                            <span
                                onClick={() => setEditingValue(key)}
                                className="cursor-pointer flex items-center"
                            >
                                {key}
                            </span>
                        )}
                        <div className="flex flex-col">
                            {editingValue === key + value ? (
                                suggestions ? (
                                    <AutoCompleteInput
                                        defaultValue={value}
                                        suggestions={suggestions}
                                        onClose={(val) => editValue(key, val)}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        defaultValue={value}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.target.blur()
                                            }
                                        }}
                                        onBlur={(e) =>
                                            editValue(key, e.target.value)
                                        }
                                    />
                                )
                            ) : (
                                <span
                                    onClick={() => setEditingValue(key + value)}
                                    className="cursor-pointer flex items-center"
                                >
                                    {value === emptyValue ? (
                                        <div className="text-red-600">
                                            {value}
                                        </div>
                                    ) : (
                                        value
                                    )}
                                    <Button
                                        icon="delete"
                                        className="text-sm text-red-500 hover:text-red-800 p-1 ml-2"
                                        onPressed={() => handleDeleteKey(key)}
                                    />
                                </span>
                            )}
                        </div>
                    </div>
                )
            )}
            <div className="mt-2">
                {object.suggestions ? (
                    <AutoCompleteInput
                        defaultValue=""
                        suggestions={object.suggestions}
                        onClose={(value) => addNewKey(value)}
                    />
                ) : (
                    <input />
                )}
            </div>
        </div>
    )
}

const splitByMatch = (string, search) => {
    if (search === "") return [string]
    const result = []
    let currentIndex = 0
    let matchIndex

    const lcString = string.toLowerCase()
    const lcSearch = search.toLowerCase()

    while ((matchIndex = lcString.indexOf(lcSearch, currentIndex)) !== -1) {
        result.push(
            string.slice(currentIndex, matchIndex),
            string.slice(matchIndex, matchIndex + search.length)
        )
        currentIndex = matchIndex + search.length
    }

    result.push(string.slice(currentIndex))
    return result
}

const JsonTextarea = ({
    value,
    sendJsonValidityToParent,
    sendTextareaValueToParent
}) => {
    const handleChange = (val) => {
        sendTextareaValueToParent(val)
        sendJsonValidityToParent(isValidJson(val))
    }

    return (
        <textarea
            placeholder="Enter Body"
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onChange={(e) => handleChange(e.target.value)}
            value={value}
        />
    )
}

function ColorBox({ color, width, height, className }) {
    const boxStyle = {
        width,
        height
    }
    const bgStyle = {
        backgroundColor: color
    }
    const cls = new ClassNames("relative checkerboard-bg", className)
    return (
        <div className={cls.value} style={boxStyle}>
            <div className="absolute full" style={bgStyle} />
        </div>
    )
}

function useUpdateOnEntityIndexChanges(entityIndex, callback) {
    const update = useComponentUpdate()

    useEffect(() => {
        const callbackAndUpdate = !callback
            ? () => {
                  update()
              }
            : (values) => {
                  callback(values)
                  update()
              }
        entityIndex.addListener(callbackAndUpdate)
        return () => {
            entityIndex.removeListener(callbackAndUpdate)
        }
    }, [entityIndex])
    return update
}

const action2name = {
    add: "New"
}
const action2icon = {
    add: "add"
}

const getActionName = (action) => action2name[action] ?? action
const getActionIcon = (action) => action2icon[action] ?? action

function EntityPicker({
    className,
    itemClassName,
    entityIndex,
    pick,
    matcher,
    emptyMsg = "No items available",
    wrap = true,
    sized = true,
    styled = true,
    colored = true,
    bordered = true,
    divided = true,
    padded = true,
    render = (item) => item.name,
    ...props
}) {
    useUpdateOnEntityIndexChanges(entityIndex)

    const [filter, setFilter] = useState("")
    const { matches, isFiltered } = entityIndex.getView({
        match: matcher,
        filter
    })

    const container = useItemContainer({
        items: matches,
        item2value: (item) => entityIndex.getEntityObject(item)
    })
    useFocusOnItemContainer({ container })
    usePickerOnItemContainer({
        container,
        pick
    })

    const items = entityIndex.getEntityObjects(matches)

    const cls = ClassNames("stack-v overflow-auto auto", className)
    cls.addIf(styled && colored, "bg-input-bg text-input-text")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && bordered && colored, "border-input-border")
    cls.addIf(styled && divided, "divide-y")
    cls.addIf(styled && divided && colored, "divide-input-border")

    const elems = []
    const headerGroups = []

    if (props.filter && entityIndex.filterProps.length) {
        headerGroups.push(
            <div key="filter" className="stack-h items-center gap-1">
                <Icon className="text-sm" name="search" />
                <Input
                    padded={false}
                    sized={false}
                    className="text-xs p-1"
                    value={filter}
                    size={10}
                    set={setFilter}
                />
                <Button
                    icon="close"
                    disabled={!filter}
                    onPressed={() => setFilter("")}
                />
            </div>
        )
    }

    for (const [index, entity] of items.entries()) {
        const item = container.getItem(index)
        const itemCls = new ClassNames(
            "focus:outline-none focus:ring focus:ring-inset focus:ring-focus-border focus:border-0 hover:brightness-110",
            itemClassName
        )
        itemCls.addIf(styled && sized, "text-sm")
        itemCls.addIf(styled && padded, "p-2")
        itemCls.addIf(!wrap, "truncate")
        itemCls.addIf(styled && colored, "bg-input-bg text-input-text")

        let elem = (
            <Div key={index} className={itemCls.value} {...item.attr.props}>
                {render(entity)}
            </Div>
        )
        elems.push(elem)
    }
    elems.push(
        <div key={-1} className="auto bg-black/10">
            {items.length === 0 && (
                <Centered className="opacity-50 text-xs">
                    {isFiltered ? `No matches for "${filter}"` : emptyMsg}
                </Centered>
            )}
        </div>
    )

    const itemsDiv = (
        <Div className={cls.value} {...container.attr.props}>
            {elems}
        </Div>
    )
    if (!headerGroups.length) return itemsDiv

    return (
        <div className="stack-v h-full">
            <div className="bg-header-bg/50 text-header-text text-xs border-header-border border-x border-t p-1">
                {headerGroups}
            </div>
            {itemsDiv}
        </div>
    )
}

function EntityStack({
    entityIndex,
    emptyMsg,
    actions = [],
    itemActions,
    matcher,
    compact,
    render = (item) => item.name
}) {
    const stackRef = useRef()
    const [selected, setSelected] = useState([])
    useUpdateOnEntityIndexChanges(entityIndex)

    const actionBtns = []
    const hotKeys = {}
    for (const { action, name, icon, op } of actions) {
        const actionHandler = () => op.exec(selected, setSelected)
        hotKeys[action] = actionHandler
        actionBtns.push({
            name: name ?? getActionName(action),
            icon: icon ?? getActionIcon(action),
            disabled: op.can && !op.can(selected),
            onPressed: actionHandler
        })
    }
    useHotKeys(stackRef, hotKeys)
    const isCompact = compact && entityIndex.length === 0

    return (
        <Div
            ref={stackRef}
            className="stack-v border border-header-border/50 divide divide-header-border/25"
        >
            <div className="bg-header-bg/25 p-1">
                <ButtonGroup buttons={actionBtns} />
            </div>

            {!isCompact && (
                <Stack
                    vertical
                    className="text-app-text overflow-auto max-h-max"
                >
                    <EntityList
                        full
                        entityIndex={entityIndex}
                        selected={selected}
                        setSelected={setSelected}
                        itemActions={itemActions}
                        emptyMsg={emptyMsg}
                        matcher={matcher}
                        compact={compact}
                        render={render}
                    />
                </Stack>
            )}

            {!(compact || isCompact) && (
                <div className="bg-header-bg/25 p-1 text-app-text/75 text-xs">
                    <span className="text-app-text/50">Items:</span>{" "}
                    <span>{entityIndex.length}</span>
                    {selected.length > 0 && (
                        <>
                            {" "}
                            <span className="text-app-text/50">
                                {" "}
                                / Marked:
                            </span>{" "}
                            {selected.length}
                        </>
                    )}
                </div>
            )}
        </Div>
    )
}

function EntityActionList({
    className,
    itemClassName,
    render = (item) => item.value,
    pick = () => {},
    matcher,
    entityIndex,
    full,
    selected,
    setSelected,
    itemActions,
    compact,
    wrap = true,
    bordered = true,
    divided = true,
    padded = true,
    sized = true,
    colored = true,
    styled = true,
    emptyMsg = "No items available",
    ...props
}) {
    const viewOptions = matcher ? { match: matcher } : {}
    const { matches } = entityIndex.getView(viewOptions)
    const entities = entityIndex.getEntityObjects(matches)
    useUpdateOnEntityIndexChanges(entityIndex)

    const cls = new ClassNames("stack-v overflow-y-auto", className)
    cls.addIf(styled && colored, "bg-input-bg text-input-text")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && bordered && colored, "border-input-border")
    cls.addIf(styled && divided, "divide-y")
    cls.addIf(styled && divided && colored, "divide-input-border")

    const container = useItemContainer({
        items: matches,
        item2value: (x) => entityIndex.getEntityPropValue(x, "value"),
        value2item: (x) => entityIndex.getEntityByPropValue("value", x)
    })
    if (itemActions) {
        useFocusGroupsOnItemContainer({ container })
    } else {
        useFocusOnItemContainer({ container })
    }
    useSelectionOnItemContainer({
        container,
        events: false,
        selection: selected,
        setSelection: setSelected
    })

    const divAttr = useGetAttrWithDimProps(props)
    cls.addIf(!divAttr.style?.width && !full, "max-w-max")
    cls.addIf(full, "w-full")
    cls.addIf(!wrap, "text-nowrap")

    let getItemActions = () => []
    if (itemActions) {
        getItemActions = (index) => {
            const buttons = []
            for (const { action, ...button } of itemActions) {
                buttons.push({
                    onPressed: () =>
                        action(entities[index].index, selected, setSelected),
                    ...button
                })
            }
            return <ButtonGroup rowIndex={index} buttons={buttons} />
        }
    }

    const elems = []
    for (const [index, entity] of entities.entries()) {
        const item = container.getItem(index)

        const itemCls = new ClassNames("hover:brightness-110", itemClassName)
        itemCls.addIf(
            !itemActions,
            "focus:outline-none focus:ring focus:ring-inset focus:ring-focus-border focus:border-0"
        )
        itemCls.addIf(styled && sized, "text-sm")
        itemCls.addIf(styled && padded, "p-2")
        itemCls.addIf(!wrap, "truncate")
        if (styled && colored) {
            itemCls.addIf(
                item.marked,
                "bg-active-bg text-active-text",
                "bg-input-bg text-input-text"
            )
        }
        const args = [entity]
        // if (itemActions) args.push(getItemActions(index))
        itemCls.add("auto")

        let elem = itemActions ? (
            <Div
                key={entity.index}
                {...item.attr.props}
                className="stack-h gap-2 w-full items-start"
            >
                <div className="p-2">{getItemActions(index)}</div>
                <Div className={itemCls.value}>{render(...args)}</Div>
            </Div>
        ) : (
            <Div
                key={entity.index}
                {...item.attr.props}
                className={itemCls.value}
            >
                {render(...args)}
            </Div>
        )
        elems.push(elem)
    }

    if (compact && !elems.length) return

    return (
        <Div className={cls.value} {...container.attr.props} {...divAttr}>
            {elems.length ? (
                elems
            ) : (
                <Centered className="text-xs text-input-text/75 p-2">
                    {emptyMsg}
                </Centered>
            )}
        </Div>
    )
}

function EntityList(props) {
    if (props.itemActions && props.itemActions.length) {
        return (
            <FocusRowCtx>
                <EntityActionList {...props} />
            </FocusRowCtx>
        )
    }
    return <EntityActionList {...props} />
}

function BodyTextarea({
    type,
    value,
    set,
    mode,
    setMode,
    reverse,
    validator,
    markInvalid,
    className,
    ...props
}) {
    const aContext = useContext(AppContext)
    const callAfterwards = useCallAfterwards()

    const modeOptions = aContext.getModeOptionsForBodyType(type)
    const setModeRaw = (newMode) => {
        set(aContext.doBodyConversion(value, mode, newMode))
        setMode(newMode)
    }
    const setModeManual = (newMode) => {
        aContext.setLastBodyTypeMode(type, newMode)
        setModeRaw(newMode)
    }
    const lastType = useRef(type)
    const checkCls = ClassNames(
        "stack-h text-xs items-center gap-1 px-2 border"
    )
    const isValid = useMemo(() => {
        return aContext.isValidBody(mode, value, validator)
    }, [value, mode])
    checkCls.addIf(
        isValid,
        "border-ok-text bg-ok-bg text-ok-text",
        "border-warning-text bg-warning-bg text-warning-text"
    )
    useMarkInvalid(checkCls, !(markInvalid ? isValid : true))

    if (!aContext.hasBodyTypeMode(type, mode) || type !== lastType.current) {
        lastType.current = type
        callAfterwards(setModeRaw, aContext.getLastBodyTypeMode(type))
    }
    const iconName = isValid ? "check" : "close"
    const format = () => {
        set(aContext.getFormatedBody(mode, value))
    }
    const cls = ClassNames("stack-v full-w", className)
    const controls = (
        <div className="stack-h full-w p-1 gap-2">
            <div className="auto">
                <Radio options={modeOptions} value={mode} set={setModeManual} />
            </div>
            {!!value && aContext.hasBodyValidator(mode) && (
                <div className={checkCls.value}>
                    <div>
                        <Icon name={iconName} />
                    </div>
                    <div>{aContext.getBodyModeName(mode)}</div>
                </div>
            )}
            <Button name="Format" disabled={!isValid} onPressed={format} />
        </div>
    )
    const textarea = <Textarea value={value} set={set} {...props} />

    return reverse ? (
        <div className={cls.value}>
            {textarea}
            {controls}
        </div>
    ) : (
        <div className={cls.value}>
            {controls}
            {textarea}
        </div>
    )
}

function getPathElem(tree, path) {
    if (tree === undefined || path === undefined) return

    if (!path.length) return tree

    const [curr, ...remPath] = path

    return getPathElem(tree[curr], remPath)
}

function JsonPathBrowser({ close, loadTree, root, save, ...props }) {
    const [ready, setReady] = useState(false)
    const [tree, setTree] = useState({})
    const [path, setPath] = useState(() => {
        if (!props.path) return []

        const parsed = getParsedJson(props.path)
        return isArray(parsed) ? parsed : []
    })

    useEffect(() => {
        if (!loadTree) {
            setReady(true)
            return
        }
        loadTree().then((loadedTree) => {
            setTree(loadedTree)
            setReady(true)
        })
    }, [])

    const curr = getPathElem(tree, path)
    const levelOptions = useMemo(() => {
        const options = []

        if (isArray(curr)) {
            for (const [index, value] of curr.entries()) {
                options.push({ id: index, name: `Index ${index}` })
            }
        } else if (isObject(curr)) {
            for (const [key, value] of Object.entries(curr)) {
                options.push({ id: key, name: `Key ${JSON.stringify(key)}` })
            }
        }
        return options.length ? options : [{ id: -1, name: "" }]
    }, [ready, path])

    const buttons = [
        {
            icon: "close",
            disabled: path.length === 0,
            onPressed: () => setPath([])
        },
        {
            icon: "undo",
            disabled: path.length === 0,
            onPressed: () => {
                setPath(path.slice(0, path.length - 1))
            }
        }
    ]
    const noOptions = levelOptions[0].id === -1

    return (
        <>
            {!ready && (
                <div className="p-4">
                    <LoadingSpinner />
                </div>
            )}
            {ready && (
                <OkCancelLayout
                    cancel={close}
                    ok={() => {
                        save(JSON.stringify(path))
                    }}
                >
                    <FormGrid>
                        <CustomCells name="Path:">
                            <div className="stack-h gap-2 w-full">
                                <Input
                                    value={getExtractPathForString(
                                        JSON.stringify(path),
                                        root
                                    )}
                                    set={() => {}}
                                    readOnly
                                    className="auto"
                                />
                                <ButtonGroup buttons={buttons} />
                            </div>
                        </CustomCells>
                        <SelectCells
                            name="Add:"
                            value={noOptions ? -1 : ""}
                            disabled={noOptions}
                            set={(value) => setPath([...path, value])}
                            options={levelOptions}
                        />
                        <CustomCells name="Preview:">
                            <div className="stack-v gap-2 w-full">
                                <div className="opacity-50 text-sm">
                                    {getSimpleType(curr) + ":"}
                                </div>
                                <div
                                    style={{ width: "500px", height: "300px" }}
                                    className="overflow-auto text-xs w-full"
                                >
                                    <PreBlockContent
                                        mime="text/json"
                                        content={JSON.stringify(curr)}
                                    />
                                </div>
                            </div>
                        </CustomCells>
                    </FormGrid>
                </OkCancelLayout>
            )}
            {}
        </>
    )
}

function JsonPathInput({
    treeProvider,
    root = "",
    path,
    setPath,
    disabled,
    loadTree,
    ...props
}) {
    const BrowseModal = useModalWindow()

    const buttons = [
        {
            icon: "edit",
            disabled,
            onPressed: () => {
                BrowseModal.open({
                    path,
                    root,
                    treeProvider,
                    loadTree,
                    save: (newPath) => {
                        setPath(newPath)
                        BrowseModal.close()
                    }
                })
            }
        },
        { icon: "delete", onPressed: () => setPath("") }
    ]
    const extractPath = getExtractPathForString(path, root)
    return (
        <>
            <div className="stack-h gap-2">
                <Input
                    value={extractPath}
                    set={() => undefined}
                    readOnly
                    {...props}
                />
                <ButtonGroup buttons={buttons} />
            </div>

            <BrowseModal.content>
                <JsonPathBrowser {...BrowseModal.props} />
            </BrowseModal.content>
        </>
    )
}

const modeOptions = [
    {id: 'includes', name: "Include"},
    {id: 'startsWith', name: "Prefix"},
    {id: 'endsWith', name: "Suffix"},
    {id: 'exact', name: "Exact"}
]

function Filterbox({ filter, icon, setFilter, caseSensitive, setCaseSensitive, or, setOr, mode, setMode }) {
    const buttons = [
        {
            icon: "close",
            disabled: !filter,
            onPressed: () => setFilter("")
        }
    ]
    if (setCaseSensitive) {
        buttons.push({
            icon: "opacity",
            activated: caseSensitive,
            value: true,
            onPressed: () => setCaseSensitive(!caseSensitive)
        })
    }
    if (setOr) {
        buttons.push({
            name: "OR",
            activated: or,
            value: true,
            onPressed: () => setOr(!or)
        })
    }
    return (
        <div key="filter" className="stack-h items-center gap-1">
            {icon && <div
                    className={
                        "px-1" +
                        (filter === ""
                            ? ""
                            : " bg-active-bg text-active-text border border-active-text")
                    }
                >
                    <Icon className="text-sm" name="search" />
                </div>
            }
            {!!setMode && <Select options={modeOptions} value={mode} set={setMode} /> }
            <Input
                padded={false}
                sized={false}
                className="text-xs p-1"
                value={filter}
                size={10}
                set={setFilter}
            />
            <ButtonGroup buttons={buttons} />
        </div>
    )
}

function MaxNumber({ className, value, maxValue = value }) {
    const cls = ClassNames("whitespace-pre font-mono", className)
    let pre = `${value}`
    const preMax = `${maxValue}`
    while (pre.length < preMax.length) {
        pre = " " + pre
    }
    return <div className={cls.value}>{pre}</div>
}

function NumberChip({ value, maxValue, icon, color = true, className = "" }) {
    const cls = ClassNames("stack-h px-d2x gap-x-d1x items-center rounded-full text-xs", className)
    cls.addIf(color, "bg-active-bg text-active-text")
    const elem = maxValue !== undefined ? <MaxNumber value={value} maxValue={maxValue} /> : <div>{value}</div>
    return <div className={cls.value}>{icon && <Icon name="add_circle" />}{elem}</div>
}

export {
    useRegisterAppListeners,
    useComponentUpdate,
    useMounted,
    useDebugMount,
    useItemContainer,
    useFocusGroupsOnItemContainer,
    useFocusOnItemContainer,
    usePickerOnItemContainer,
    useGetTabIndex,
    useGetAttrWithDimProps,
    useGetNewAttrWithDimProps,
    useHotKeys,
    useCallAfterwards,
    useExtractDimProps,
    useMarkInvalid,
    useConfirmation,
    useUpdateOnEntityIndexChanges,
    useErrorWindow,
    getCols,
    HighlightMatches,
    splitByMatch,
    useLoadingSpinner,
    DualRing,
    KeyValueEditor,
    HighlightKeys,
    JsonTextarea,
    ColorBox,
    EntityList,
    EntityStack,
    EntityPicker,
    BodyTextarea,
    JsonPathInput,
    Filterbox,
    FocusRowContext,
    FocusRowCtx,
    NumberChip,
    FOCUS_EVENTS
}
