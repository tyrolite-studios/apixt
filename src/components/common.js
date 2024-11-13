import { useRef, useState, useEffect, useContext } from "react"
import { useModalWindow } from "./modal"
import { ClassNames, isValidJson, clamp, d } from "core/helper"
import {
    Button,
    ButtonGroup,
    AutoCompleteInput,
    FormGrid,
    InputCells,
    SelectCells
} from "./form"
import { Centered, Div, Stack, Icon, OkCancelLayout } from "./layout"
import { AppContext } from "./context"

function useComponentUpdate() {
    const mounted = useMounted()
    const [updates, setUpdates] = useState(false)
    const updateRef = useRef(null)
    updateRef.current = updates
    return () => {
        if (mounted.current) {
            setUpdates(!updateRef.current)
        }
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

const useGetTabIndex = ({ tab, tabControlled, focused }, cls) => {
    if (tab && cls) {
        cls.add("tabbed")
    }
    if ((tabControlled && tab) || (!tabControlled && focused) || tab) return 0

    return tab === false ? -1 : undefined
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
    const style = attr.style ? attr.style : {}
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

const doubleClickMs = 200

function useFocusManager({
    name,
    treeView,
    selector,
    syncSelection,
    rootSelect,
    dblAction,
    active,
    rowChange,
    items,
    lastTabIndex,
    pos = 0,
    setPos = () => null,
    page,
    reset,
    keyTracking = () => {},
    handleSpace,
    update,
    ...props
}) {
    const aContext = useContext(AppContext)
    const callAfterwards = useCallAfterwards()

    const doubleRef = useRef({})
    const [catchFocus, setCatchFocus] = useState(true)

    const [focused, setFocused] = useState(false)
    const [tabIndex, setTabIndexRaw] = useState(0)
    const setTabIndex = (value) => {
        // keyTracking(value)
        setTabIndexRaw(value)
    }
    // if (treeView) items = treeView.getViewIndices()
    const initCatchRef = useRef(false)
    const autoRef = useRef(null)
    // ??
    const divRef = props.divRef ? props.divRef : autoRef
    const setActive = (value) => {
        if (value !== null) {
            setTabIndex(getItemIndex(value))
        }
        selector ? selector.select(value) : props.setActive(value)
    }

    const mounted = useMounted()
    const levelRef = useRef(null)
    if (levelRef.current === null) {
        levelRef.current = aContext.getModalLevel()
    }
    const count = items ? items.length : props.count
    const getItem = items ? (index) => items[index] : (index) => index
    const getItemIndex = items
        ? (item) => items.indexOf(item)
        : (item) => (item >= count || item < 0 ? -1 : item)
    if (!page) {
        page = count
    }
    const lastPos = Math.max(count - page, 0)
    let currPos = pos
    if (lastPos > 0 && currPos > lastPos) {
        callAfterwards(setPos, lastPos)
        currPos = lastPos
    }
    const refocus = () => {
        requestAnimationFrame(() => {
            if (!mounted.current || !divRef.current) return

            const elems = divRef.current.querySelectorAll(".tabbed")
            if (elems.length) {
                elems[elems.length - 1].focus()
                setCatchFocus(false)
            }
        })
    }
    // current tab index exceeds limit? then reset to last index
    if (tabIndex !== null && count > 0 && tabIndex >= count && !catchFocus) {
        callAfterwards(setTabIndex, count - 1)
        callAfterwards(refocus)
    }
    const lastIndex = count - 1
    const last = Math.min(lastIndex, lastPos + page - 1, currPos + page - 1)
    const nextPageStart = currPos + page

    const hasPaging = page < count
    let activeIndex = -1
    if (selector) {
        for (let i = pos; i < nextPageStart; i++) {
            if (selector.isSelected(getItem(i))) {
                activeIndex = i
                break
            }
        }
    } else {
        activeIndex = getItemIndex(active)
    }
    /*
    if (syncSelection && treeView && selector && selector.selection) {
        selector.syncWithTreeView(treeView, getItem)
    }
    */

    const activateIndex = (index, e = null) => {
        const curr = Date.now()
        const hasEvent = e !== null
        const { last, hadEvent, lastX, lastY } = doubleRef.current
        let isDouble = false
        let newX = hasEvent ? e.clientX : null
        let newY = hasEvent ? e.clientY : null
        if (dblAction && last && hasEvent === hadEvent) {
            if (
                doubleClickMs > curr - last &&
                (!hasEvent ||
                    (Math.abs(lastX - newX) < 10 &&
                        Math.abs(lastY - newY) < 10))
            ) {
                isDouble = true
            }
        }
        doubleRef.current = {
            last: curr,
            hadEvent: hasEvent,
            lastX: newX,
            lastY: newY
        }
        const newActive = getItem(index)
        if (selector) {
            const isSelected = selector.isSelected(newActive)
            const handleClick = () => {
                doubleRef.current.delayed = null
                if (rootSelect && treeView && !isSelected) {
                    selector.selectAsRoot(treeView, newActive)
                } else {
                    selector.select(newActive)
                }
            }

            if (dblAction && !isDouble && isSelected) {
                doubleRef.current.delayed = handleClick
                setTimeout(() => {
                    if (doubleRef.current.delayed) doubleRef.current.delayed()
                }, doubleClickMs)
            } else {
                if (isDouble) {
                    doubleRef.current.delayed = null
                    dblAction(index)
                } else handleClick()
            }
        } else {
            setActive(
                reset && newActive !== null && newActive === active
                    ? null
                    : newActive
            )
        }
    }

    const isOutsideFocus =
        hasPaging && (activeIndex < currPos || activeIndex >= nextPageStart)

    const autoFocus = (e) => {
        if (!mounted.current) return
        setCatchFocus(false)
        const newTabIndex =
            lastTabIndex !== undefined
                ? lastTabIndex
                : activeIndex === -1
                  ? 0
                  : activeIndex
        setTabIndex(
            isOutsideFocus || newTabIndex === null ? currPos : newTabIndex
        )
        refocus()
    }
    const onBlur = (e) => {
        setFocused(false)
        if (aContext.getModalLevel() !== levelRef.current) return
        initCatchRef.current = true
        requestAnimationFrame(() => {
            if (!mounted.current) return
            if (initCatchRef.current) {
                setCatchFocus(true)
                keyTracking(null)
            }
            initCatchRef.current = false
        })
    }
    const onKeyDown = (e) => {
        if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
            if (rowChange && e.key === "ArrowUp") {
                rowChange("arrow", -1, tabIndex)
            } else if (
                treeView &&
                e.key === "ArrowLeft" &&
                !treeView.isLeafByViewIndex(tabIndex) &&
                !treeView.isClosedByViewIndex(tabIndex)
            ) {
                treeView.toggleNodeByViewIndex(tabIndex, true)
                return
            }
            if (tabIndex === 0) {
                setTabIndex(lastIndex)
                setPos(lastPos)
            } else if (!hasPaging) {
                setTabIndex(e.shiftKey ? 0 : clamp(0, tabIndex - 1))
            } else {
                let newPos = clamp(0, tabIndex - (e.shiftKey ? page : 1))
                if (newPos < currPos) {
                    setPos(clamp(0, currPos - page))
                }
                setTabIndex(newPos)
            }
            e.preventDefault()
        } else if (["ArrowRight", "ArrowDown"].includes(e.key)) {
            if (rowChange && e.key === "ArrowDown") {
                rowChange("arrow", 1, tabIndex)
            } else if (
                treeView &&
                e.key === "ArrowRight" &&
                !treeView.isLeafByViewIndex(tabIndex) &&
                treeView.isClosedByViewIndex(tabIndex)
            ) {
                treeView.toggleNodeByViewIndex(tabIndex, false)
                return
            }
            if (tabIndex === lastIndex) {
                setTabIndex(0)
                setPos(0)
            } else if (!hasPaging) {
                setTabIndex(
                    e.shiftKey ? lastIndex : Math.min(lastIndex, tabIndex + 1)
                )
            } else {
                const newPos = Math.min(
                    tabIndex + (e.shiftKey ? page : 1),
                    lastIndex
                )
                if (newPos >= nextPageStart) {
                    setPos(Math.min(nextPageStart, lastPos))
                }
                setTabIndex(newPos)
            }
            e.preventDefault()
        } else if (handleSpace && e.key === " ") {
            if (e.repeat) return
            activateIndex(tabIndex)
            // prevent scrolling
            e.preventDefault()
        } else if (rowChange && e.key === "Tab") {
            rowChange("tab", e.shiftKey ? -1 : 1)
            e.preventDefault()
            return
        } else {
            return
        }
        refocus()
    }
    const itemAttr = (index) => {
        const isCatcher = catchFocus && index === pos
        const params = {
            tab: (tabIndex === index && !catchFocus) || isCatcher,
            onMouseDown: (e) => {
                if (!mounted.current) return

                if (rowChange) {
                    rowChange("row", e.target)
                }
                setTabIndex(index)
                activateIndex(index, e)
                setCatchFocus(false)
            }
        }
        if (isCatcher) {
            params.onFocus = autoFocus
        }
        return params
    }
    const attr = {
        onBlur,
        onFocus: () => {
            setFocused(true)
            initCatchRef.current = false
        },
        onKeyDown
    }
    if (!props.divRef) {
        attr.ref = divRef
    }
    return {
        attr,
        hasFocus: focused,
        last,
        tabIndex,
        itemAttr,
        refocus,
        focusItem: tabIndex,
        setTabIndex: (index) => {
            setCatchFocus(false)
            setTabIndex(index)
        },
        setActiveFocus: setActive
    }
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

function LoadingSpinner({ abort, close }) {
    return (
        <div className="stack-v gaps-1 p-4 text-center">
            <div className="px-4 py-2">Loading...</div>

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
        start: (promise, abort) => {
            setOpen(true)
            SpinnerWindow.open({
                abort,
                cleanUp: (source) => {
                    if (source) abort()
                }
            })
            promise.finally(() => {
                if (openRef.current) {
                    SpinnerWindow.close()
                    setOpen(false)
                }
            })
            return promise
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
        <OkCancelLayout cancel={close} ok={() => ok()}>
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

function EntityList2({
    className,
    itemClassName,
    render = (item) => item.value,
    pick = () => {},
    entityIndex,
    full,
    selected,
    setSelected,
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
    let [active, setActive] = useState(
        props.active === undefined || entityIndex.getLength() === 0
            ? null
            : props.active
    )
    const entities = entityIndex.getEntityObjects()
    if (props.setActive !== undefined) {
        setActive = props.setActive
        active = props.active
    }
    const update = useUpdateOnEntityIndexChanges(entityIndex)

    const cls = new ClassNames("stack-v overflow-y-auto", className)
    cls.addIf(styled && colored, "bg-input-bg text-input-text")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && bordered && colored, "border-input-border")
    cls.addIf(styled && divided, "divide-y")
    cls.addIf(styled && divided && colored, "divide-input-border")
    const stackRef = useRef(null)
    const { focusItem, hasFocus, attr, tabIndex, ...focus } = useFocusManager({
        setActive: (index) => {
            if (!selected.includes(index)) {
                setSelected([...selected, index])
            } else {
                setSelected(selected.filter((item) => index !== item))
            }
            setActive(index)
        },
        update,
        active,
        deselect: true,
        divRef: stackRef,
        count: entityIndex.length,
        handleSpace: true
    })
    const divAttr = useGetAttrWithDimProps(props)
    cls.addIf(!divAttr.style?.width && !full, "max-w-max")
    cls.addIf(full, "w-full")
    cls.addIf(!wrap, "text-nowrap")

    const elems = []
    let i = 0

    for (const option of entities) {
        const isFocused = hasFocus && i === tabIndex

        const itemCls = new ClassNames(
            "hover:brightness-110 focus:outline-none focus:ring focus:ring-inset focus:ring-focus-border focus:border-0",
            itemClassName
        )
        itemCls.addIf(styled && sized, "text-sm")
        itemCls.addIf(styled && padded, "p-2")
        itemCls.addIf(!wrap, "truncate")
        if (styled && colored) {
            itemCls.addIf(
                selected.includes(i),
                "bg-active-bg text-active-text",
                "bg-input-bg text-input-text"
            )
        }
        const itemAttr = focus.itemAttr(i)
        itemAttr.style = {
            cursor: "pointer"
        }
        if (isFocused) {
            itemAttr.style.zIndex = 40
        }
        elems.push(
            <Div key={i} className={itemCls.value} {...itemAttr}>
                {render(option)}
            </Div>
        )
        i++
    }
    return (
        <div ref={stackRef} className={cls.value} {...attr} {...divAttr}>
            {elems.length ? (
                elems
            ) : (
                <Centered className="text-xs text-input-text/75 p-2">
                    {emptyMsg}
                </Centered>
            )}
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

function EntityStack({
    entityIndex,
    emptyMsg,
    actions = [],
    itemActions = [],
    matcher,
    render = (item) => item.name
}) {
    const stackRef = useRef()
    const [selected, setSelected] = useState([])
    const update = useUpdateOnEntityIndexChanges(entityIndex)

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

    return (
        <Div
            ref={stackRef}
            className="stack-v border border-header-border/50 divide divide-header-border/25"
        >
            <div className="bg-header-bg/25 p-1">
                <ButtonGroup buttons={actionBtns} />
            </div>

            <Stack vertical className="text-app-text overflow-auto max-h-max">
                <EntityList
                    full
                    entityIndex={entityIndex}
                    selected={selected}
                    setSelected={setSelected}
                    itemActions={itemActions}
                    emptyMsg={emptyMsg}
                    matcher={matcher}
                    render={render}
                />
            </Stack>

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
        </Div>
    )
}

function EntityList({
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
    const mounted = useMounted()
    const [catchFocus, setCatchFocus] = useState(true)
    const [focusRow, setFocusRow] = useState(0)
    const [lastTabIndex, setLastTabIndex] = useState(0)
    let [active, setActive] = useState(
        props.active === undefined || entityIndex.getLength() === 0
            ? null
            : props.active
    )
    const entities = entityIndex.getEntityObjects(
        matcher ? entityIndex.getView({ match: matcher }).matches : undefined
    )
    if (props.setActive !== undefined) {
        setActive = props.setActive
        active = props.active
    }
    const update = useUpdateOnEntityIndexChanges(entityIndex)

    const cls = new ClassNames("stack-v overflow-y-auto", className)
    cls.addIf(styled && colored, "bg-input-bg text-input-text")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && bordered && colored, "border-input-border")
    cls.addIf(styled && divided, "divide-y")
    cls.addIf(styled && divided && colored, "divide-input-border")
    const stackRef = useRef(null)

    let { focusItem, hasFocus, attr, tabIndex, ...focus } = useFocusManager({
        setActive: (index) => {
            if (!selected.includes(index)) {
                setSelected([...selected, index])
            } else {
                setSelected(selected.filter((item) => index !== item))
            }
            setActive(index)
        },
        update,
        active,
        deselect: true,
        divRef: stackRef,
        count: entityIndex.length,
        handleSpace: true
    })
    if (itemActions) {
        attr = {}
        tabIndex = -1
    }

    const divAttr = useGetAttrWithDimProps(props)
    cls.addIf(!divAttr.style?.width && !full, "max-w-max")
    cls.addIf(full, "w-full")
    cls.addIf(!wrap, "text-nowrap")

    let getItemActions = () => []
    if (itemActions) {
        const refocus = () => {
            const elems = stackRef.current.querySelectorAll(".focus-row")
            const elem = elems[focusRow].querySelector(".tabbed")
            elem.focus()
            setCatchFocus(false)
        }

        const onBlur = () => {
            requestAnimationFrame(() => {
                if (!mounted.current) return
                if (!stackRef.current.contains(document.activeElement)) {
                    setCatchFocus(true)
                    setLastTabIndex(0)
                    setFocusRow(0)
                }
            })
        }

        const nextRow = (key, dir, tabIndex) => {
            const maxRow = entityIndex.length - 1
            if (key === "tab") {
                const all = [...document.querySelectorAll(".tabbed")]
                if (dir === -1) all.reverse()

                let found = false
                for (const elem of all) {
                    if (
                        elem === stackRef.current ||
                        stackRef.current.contains(elem)
                    ) {
                        found = true
                    } else if (found) {
                        elem.focus()
                        break
                    }
                }
                return
            } else if (key === "row") {
                let elem = dir
                let buttonElem = dir
                while (!elem.classList.contains("focus-row")) {
                    if (elem.tagName === "BUTTON") buttonElem = elem
                    if (elem === stackRef.current) {
                        elem = null
                        break
                    }
                    elem = elem.parentNode
                }
                const rowButtons = [...elem.querySelectorAll("button")]
                setLastTabIndex(rowButtons.indexOf(buttonElem))
                if (elem) {
                    const all = [
                        ...stackRef.current.querySelectorAll(".focus-row")
                    ]
                    const index = all.indexOf(elem)
                    setFocusRow(index)
                }
                return
            }
            let newRow = focusRow + dir
            if (newRow > maxRow) {
                newRow = 0
            } else if (newRow < 0) {
                newRow = maxRow
            }
            setFocusRow(newRow)
            setLastTabIndex(tabIndex)
            requestAnimationFrame(refocus)
        }

        attr.tab = entityIndex.length && catchFocus ? "true" : undefined
        attr.onFocus = refocus
        attr.onBlur = onBlur

        getItemActions = (item) => {
            const buttons = []
            for (const { action, ...button } of itemActions) {
                buttons.push({
                    onPressed: () => action(item, selected, setSelected),
                    ...button
                })
            }
            return (
                <ButtonGroup
                    lastTabIndex={lastTabIndex}
                    setLastTabIndex={setLastTabIndex}
                    rowChange={nextRow}
                    buttons={buttons}
                    className="focus-row"
                />
            )
        }
    }

    const elems = []
    let i = 0

    for (const entity of entities) {
        const isFocused = hasFocus && i === tabIndex

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
                selected.includes(i),
                "bg-active-bg text-active-text",
                "bg-input-bg text-input-text"
            )
        }
        const itemAttr = focus.itemAttr(i)
        itemAttr.style = {
            cursor: "pointer"
        }
        if (isFocused) {
            itemAttr.style.zIndex = 40
        }
        const args = [entity]
        // if (itemActions) args.push(getItemActions(i))
        itemCls.add("auto")

        let item = (
            <Div key={entity.index} className={itemCls.value} {...itemAttr}>
                {render(...args)}
            </Div>
        )
        if (itemActions) {
            item = (
                <div key={entity.index} className="stack-h w-full">
                    <div className="p-2">{getItemActions(entity.index)}</div>
                    {item}
                </div>
            )
        }
        elems.push(item)
        i++
    }

    return (
        <div ref={stackRef} className={cls.value} {...attr} {...divAttr}>
            {elems.length ? (
                elems
            ) : (
                <Centered className="text-xs text-input-text/75 p-2">
                    {emptyMsg}
                </Centered>
            )}
        </div>
    )
}

function FocusMatrix({}) {
    const [catchFocus, setCatchFocusRaw] = useState(true)
    const [focusRow, setFocusRow] = useState(0)
    const [lastTabIndex, setLastTabIndex] = useState(0)
    const divRef = useRef()

    const buttons = [{ name: "Mark" }, { name: "Edit" }, { name: "Delete" }]

    const items = ["Foo", "Bar", "Damn"]
    const setCatchFocus = (value) => setCatchFocusRaw(value)

    const refocus = () => {
        const elems = divRef.current.querySelectorAll(".focus-row")
        const elem = elems[focusRow].querySelector(".tabbed")
        elem.focus()
        setCatchFocus(false)
    }

    const onBlur = () => {
        requestAnimationFrame(() => {
            if (!divRef.current.contains(document.activeElement)) {
                setCatchFocus(true)
                setLastTabIndex(0)
                setFocusRow(0)
            }
        })
    }

    const nextRow = (key, dir, tabIndex) => {
        const maxRow = items.length - 1
        if (key === "tab") {
            const all = [...document.querySelectorAll(".tabbed")]
            if (dir === -1) all.reverse()

            let found = false
            for (const elem of all) {
                if (elem === divRef.current || divRef.current.contains(elem)) {
                    found = true
                } else if (found) {
                    elem.focus()
                    break
                }
            }
            return
        } else if (key === "row") {
            let elem = dir
            let buttonElem = dir
            while (!elem.classList.contains("focus-row")) {
                if (elem.tagName === "BUTTON") buttonElem = elem
                if (elem === divRef.current) {
                    elem = null
                    break
                }
                elem = elem.parentNode
            }
            const rowButtons = [...elem.querySelectorAll("button")]
            setLastTabIndex(rowButtons.indexOf(buttonElem))
            if (elem) {
                const all = [...divRef.current.querySelectorAll(".focus-row")]
                const index = all.indexOf(elem)
                setFocusRow(index)
            }
            return
        }
        let newRow = focusRow + dir
        if (newRow > maxRow) {
            newRow = 0
        } else if (newRow < 0) {
            newRow = maxRow
        }
        setFocusRow(newRow)
        setLastTabIndex(tabIndex)
        requestAnimationFrame(refocus)
    }

    return (
        <Div
            ref={divRef}
            tab={items.length && catchFocus}
            className="stack-v gap-2 divide-y"
            onFocus={refocus}
            onBlur={onBlur}
        >
            {items.map((item) => {
                return (
                    <div key={item} className="stack-h items-center">
                        <ButtonGroup
                            lastTabIndex={lastTabIndex}
                            setLastTabIndex={setLastTabIndex}
                            rowChange={nextRow}
                            buttons={buttons}
                            className="focus-row"
                        />
                        <div className="p-2">{item}</div>
                    </div>
                )
            })}
        </Div>
    )
}

function HeaderEditForm({ model, close, store, edit }) {
    const [value, setValue] = useState(model.value)
    const [type, setType] = useState(model.type)
    const [headerValue, setHeaderValue] = useState(model.headerValue)
    const typeOptions = [{ id: "fix", name: "Constant" }]
    return (
        <OkCancelLayout
            ok={() => {
                store({ value, type, headerValue })
            }}
            cancel={() => close()}
        >
            <FormGrid>
                <InputCells
                    name="Name"
                    value={value}
                    set={setValue}
                    autoFocus={!edit}
                    required
                />
                <SelectCells
                    name="Type"
                    value={type}
                    set={setType}
                    options={typeOptions}
                />
                <InputCells
                    name="Value"
                    value={headerValue}
                    set={setHeaderValue}
                    required
                    autoFocus={edit}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function HeaderStack({ headerIndex }) {
    const EditModal = useModalWindow()

    const actions = [
        {
            icon: "add",
            name: "New",
            op: {
                exec: () => {
                    EditModal.open({
                        model: {
                            name: "",
                            type: "fix",
                            headerValue: ""
                        },
                        store: (newModel) => {
                            headerIndex.setEntityObject(newModel)
                            EditModal.close()
                        }
                    })
                }
            }
        }
    ]

    const itemActions = [
        {
            icon: "edit",
            action: (index) => {
                const model = headerIndex.getEntityObject(index)
                EditModal.open({
                    model,
                    edit: true,
                    store: (newModel) => {
                        headerIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        EditModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => {
                headerIndex.deleteEntity(index)
            }
        }
    ]
    return (
        <>
            <EntityStack
                entityIndex={headerIndex}
                actions={actions}
                itemActions={itemActions}
                render={(item) => (
                    <div className="stack-v">
                        <div className="text-xs opacity-50">{item.value}:</div>
                        <pre>{item.headerValue}</pre>
                    </div>
                )}
            />

            <EditModal.content>
                <HeaderEditForm {...EditModal.props} />
            </EditModal.content>
        </>
    )
}

function QueryEditForm({ model, close, store, edit }) {
    const [value, setValue] = useState(model.value)
    const [type, setType] = useState(model.type)
    const [queryValue, setQueryValue] = useState(model.queryValue)
    const typeOptions = [{ id: "fix", name: "Constant" }]
    return (
        <OkCancelLayout
            ok={() => {
                store({ value, type, queryValue })
            }}
            cancel={() => close()}
        >
            <FormGrid>
                <InputCells
                    name="Name"
                    value={value}
                    set={setValue}
                    autoFocus={!edit}
                    required
                />
                <SelectCells
                    name="Type"
                    value={type}
                    set={setType}
                    options={typeOptions}
                />
                <InputCells
                    name="Value"
                    value={queryValue}
                    set={setQueryValue}
                    required
                    autoFocus={edit}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function QueryStack({ queryIndex }) {
    const EditModal = useModalWindow()

    const actions = [
        {
            icon: "add",
            name: "New",
            op: {
                exec: () => {
                    EditModal.open({
                        model: {
                            name: "",
                            type: "fix",
                            queryValue: ""
                        },
                        store: (newModel) => {
                            queryIndex.setEntityObject(newModel)
                            EditModal.close()
                        }
                    })
                }
            }
        }
    ]

    const itemActions = [
        {
            icon: "edit",
            action: (index) => {
                const model = queryIndex.getEntityObject(index)
                EditModal.open({
                    model,
                    edit: true,
                    store: (newModel) => {
                        queryIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        EditModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => {
                queryIndex.deleteEntity(index)
            }
        }
    ]
    return (
        <>
            <EntityStack
                entityIndex={queryIndex}
                actions={actions}
                itemActions={itemActions}
                render={(item) => (
                    <div className="stack-v">
                        <div className="text-xs opacity-50">{item.value}:</div>
                        <pre>{item.queryValue}</pre>
                    </div>
                )}
            />

            <EditModal.content>
                <QueryEditForm {...EditModal.props} />
            </EditModal.content>
        </>
    )
}

export {
    useComponentUpdate,
    useMounted,
    useDebugMount,
    useGetTabIndex,
    useGetAttrWithDimProps,
    useHotKeys,
    useCallAfterwards,
    useFocusManager,
    useExtractDimProps,
    useConfirmation,
    useUpdateOnEntityIndexChanges,
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
    FocusMatrix,
    HeaderStack,
    QueryStack
}
