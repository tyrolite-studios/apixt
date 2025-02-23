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
    clamp,
    getParsedJson,
    isObject,
    isArray,
    getSimpleType,
    d
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
    FormGrid
} from "./form"
import { Centered, Div, Stack, Icon, OkCancelLayout } from "./layout"
import { AppContext } from "./context"
import { getExtractPathForString } from "entities/assignments"
import { PreBlockContent } from "./content"
import { Attributes, without } from "../core/helper"

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

function ListTest({ entityIndex }) {
    return <ButtonGroups />

    useUpdateOnEntityIndexChanges(entityIndex)
    const items = entityIndex.getView({}).matches.slice(0, 10)

    const container = useItemContainer({ items })
    const { open, Modals } = useConfirmation()
    const [selection, setSelection] = useState([])
    useFocusOnItemContainer({
        container,
        item2value: (item) => entityIndex.getEntityPropValue(item, "value"),
        value2item: (value) => entityIndex.getEntityByPropValue("value", value)
    })
    usePickerOnItemContainer({
        container,
        pick: (entity) => entityIndex.getEntityObject(entity)
    })
    useSelectionOnItemContainer({
        container,
        selection,
        setSelection
    })

    const elems = []
    const entities = entityIndex.getEntityObjects(items)
    for (const [index, entity] of entities.entries()) {
        const elem = container.getItem(index)
        const cls = new ClassNames("hover:brightness-110")
        cls.addIf(
            elem.marked,
            "bg-active-bg text-active-text",
            "bg-input-bg text-input-text"
        )
        cls.add(
            "focus:outline-none focus:ring focus:ring-inset focus:ring-focus-border focus:border-0"
        )
        elems.push(
            <Div key={index} {...elem.attr.props} className={cls.value}>
                {entityIndex.getEntityPropValue(index, "name")}
            </Div>
        )
    }
    const buttons = [
        { name: "All", onPressed: () => container.selectInverse() }
    ]
    const containerCls = ClassNames("stack-v")
    containerCls.addIf(container.invalid, "invalid")
    return (
        <>
            <div
                className="stack-v"
                onKeyDown={(e) => {
                    if (e.key !== "d" && container.tabIndex !== undefined)
                        return

                    open({
                        confirmed: () => {
                            entityIndex.deleteEntity(items[container.tabIndex])
                            container.syncSelection()
                        }
                    })
                    e.preventDefault()
                }}
            >
                <Div {...container.attr.props} className={containerCls.value}>
                    {elems}
                </Div>
                <ButtonGroup buttons={buttons} />
            </div>
            {Modals}
        </>
    )
}

function useItemContainer({
    items,
    count,
    item2value = (x) => x,
    value2item = (x) => x
}) {
    const mounted = useMounted()
    const ref = useRef(null)
    const attr = Attributes({ ref })

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

    const container = {
        ref,
        attr,
        items,
        count,
        item2value,
        value2item,
        isMounted: () => ref.current && mounted.current,
        addItemBuilder,
        getItem
    }
    return container
}

const arrowMove = {
    prevNext: (container, x, y, shift) => {
        const next = x > 0 || y > 0
        const prev = x < 0 || y < 0

        const lastIndex = container.count - 1
        if (prev) {
            if (container.tabIndex === 0) {
                return lastIndex
            }
            return shift ? 0 : clamp(0, container.tabIndex - 1)
        }
        if (next) {
            if (container.tabIndex === lastIndex) {
                return 0
            }
            return shift
                ? lastIndex
                : Math.min(lastIndex, container.tabIndex + 1)
        }
        return container.tabIndex
    }
}

function usePickerOnItemContainer({ container, pick }) {
    const pickIndex = (index) => {
        pick(container.item2value(container.items[index]))
    }

    container.attr.addListeners({
        onKeyDown: (e) => {
            if (!container.focused) return

            if (e.key === " ") {
                pickIndex(container.tabIndex)
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

function useSelectionOnItemContainer({
    container,
    events = true,
    min = 0,
    max,
    selection,
    setSelection
}) {
    const { item2value, value2item } = container
    const syncSelection = () => {
        requestAnimationFrame(() => {
            const newSelection = []
            for (const value of selection) {
                const index = value2item(value)
                if (index !== undefined) newSelection.push(value)
            }
            setSelection(newSelection)
            container.refocus()
        })
    }

    const toggle = (index) => {
        const value = item2value(container.items[index])
        if (selection.includes(value)) {
            if (selection.length > min) {
                setSelection(without(selection, value))
            }
            return
        }
        if (max === 1) {
            setSelection([value])
        } else if (max === undefined || selection.length < max) {
            setSelection([...selection, value])
        }
    }

    if (events) {
        container.attr.addListeners({
            onKeyDown: (e) => {
                if (!container.focused) return

                if (e.key === " ") {
                    toggle(container.tabIndex)
                    e.preventDefault()
                }
            }
        })
    }

    container.addItemBuilder((index, item) => {
        if (events) {
            item.attr.addListener("onClick", (e) => {
                toggle(index)
            })
        }
        const value = item2value(container.items[index])
        item.marked = selection.includes(value)
    })
    container.selection = selection
    container.syncSelection = syncSelection
    if (min > 0 && selection.length < min) {
        container.invalid = true
    }
    if (max !== undefined) return

    container.toggle = toggle
    container.selectAll = () => {
        const allValues = container.items.map((x) => item2value(x))
        setSelection(without(allValues, selection).length ? allValues : [])
    }
    container.selectInverse = () => {
        const invValues = []
        for (const item of container.items) {
            const value = item2value(item)
            if (!selection.includes(value)) {
                invValues.push(value)
            }
        }
        setSelection(invValues)
    }
}

const FocusRowContext = createContext(null)

function FocusRowCtx({ children }) {
    const [row, setRow] = useState(0)
    const [lastTabIndex, setLastTabIndex] = useState(0)
    const containerRef = useRef(null)

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
        setLastTabIndex,
        nextRow: () => {
            const max = containerRef.current.children.length
            setRow(row + 1 >= max ? 0 : row + 1)
            refocus()
        },
        prevRow: () => {
            setRow(
                row === 0 ? containerRef.current.children.length - 1 : row - 1
            )
            refocus()
        },
        refocus,
        setRow,
        setContainer: (container) => (containerRef.current = container)
    }

    return (
        <FocusRowContext.Provider value={api}>
            {children}
        </FocusRowContext.Provider>
    )
}

function useFocusGroupsOnItemContainer({ container }) {
    const aContext = useContext(AppContext)
    const frContext = useContext(FocusRowContext)
    const initCatchRef = useRef(false)
    const levelRef = useRef(null)
    if (levelRef.current === null) {
        levelRef.current = aContext.getModalLevel()
    }

    container.attr.addListeners({
        onFocus: (e) => {
            initCatchRef.current = false
        },
        onBlur: (e) => {
            if (aContext.getModalLevel() !== levelRef.current) return

            initCatchRef.current = true
            requestAnimationFrame(() => {
                if (!container.isMounted()) return

                if (initCatchRef.current) {
                    // reset
                    frContext.setRow(0)
                    frContext.setLastTabIndex(0)
                }
                initCatchRef.current = false
            })
        }
    })
    useEffect(() => {
        frContext.setContainer(container.ref.current)
    }, [])
}

function useFocusOnItemContainer({
    container,
    rowIndex,
    cursor = true,
    moveFocus
}) {
    const aContext = useContext(AppContext)
    let frContext = useContext(FocusRowContext)
    if (rowIndex === undefined) frContext = undefined
    const callAfterwards = useCallAfterwards()

    if (moveFocus === undefined) {
        moveFocus = frContext
            ? (container, x, y, shift) => {
                  if (y === 0) return arrowMove.prevNext(container, x, y, shift)
                  if (y > 0) {
                      frContext.nextRow()
                  } else {
                      frContext.prevRow()
                  }
                  return frContext.lastTabIndex
              }
            : arrowMove.prevNext
    }

    const [focused, setFocused] = useState(false)
    const [catchFocus, setCatchFocus] = useState(true)
    const [tabIndex, setTabIndexRaw] = useState(0)
    const setTabIndex = (index) => {
        setTabIndexRaw(index)
        if (frContext) {
            frContext.setLastTabIndex(index)
        }
        if (tabIndex !== index || initCatchRef.current) {
            refocus()
        }
    }
    const initCatchRef = useRef(false)
    const minSelectRef = useRef(0)
    const levelRef = useRef(null)
    if (levelRef.current === null) {
        levelRef.current = aContext.getModalLevel()
    }

    const { ref, count } = container
    const refocus = () => {
        requestAnimationFrame(() => {
            if (!container.isMounted()) return

            const elems = ref.current.querySelectorAll(".tabbed")
            if (elems.length) {
                elems[elems.length - 1].focus()
                setCatchFocus(false)
            }
        })
    }

    // current tab index exceeds limit? then reset to last index
    if (tabIndex !== null && count > 0 && tabIndex >= count && !catchFocus) {
        callAfterwards(() => {
            setTabIndex(count - 1)
            refocus()
        })
    }

    const handleCatchedFocus = (e) => {
        if (!container.isMounted()) return

        if (frContext) e.target.blur()
        // the catcher got the focus, so we can disable the focus catching
        // because from now on, we will move the focus within the container
        setCatchFocus(false)
        let minSelected = 0
        // if we have a selection then set the focus on the first item which is
        // included in the selection
        if (frContext) {
            minSelected = frContext.lastTabIndex
        } else if (container.selection && container.selection.length) {
            while (
                minSelected < container.count &&
                !container.selection.includes(
                    container.item2value(container.items[minSelected])
                )
            ) {
                minSelected++
            }
            // no item was found, so we select the first one
            if (minSelected >= container.count) minSelected = 0
        }
        const newTabIndex = minSelected
        minSelectRef.current = minSelected

        // the newly calculated tabIndex might differ from the last
        // so set it and move the focus to it
        setTabIndex(newTabIndex)
    }
    container.attr.addListeners({
        onFocus: (e) => {
            // an element within the container has the focus
            setFocused(true)
            // that means we don't have to enable the focus catcher element
            initCatchRef.current = false
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
            let x = 0
            let y = 0
            if (e.key === "ArrowUp") y--
            if (e.key === "ArrowDown") y++
            if (e.key === "ArrowLeft") x--
            if (e.key === "ArrowRight") x++
            if (x === 0 && y === 0) return

            e.preventDefault()
            const newTabIndex = moveFocus(container, x, y, e.shiftKey)
            if (newTabIndex !== tabIndex) setTabIndex(newTabIndex)
        }
    })
    const isTabRow = !frContext || frContext.row === rowIndex
    container.addItemBuilder((index, item) => {
        item.isFocused = tabIndex === index
        const isCatcher =
            catchFocus &&
            index ===
                (!minSelectRef.current ||
                minSelectRef.current >= container.count
                    ? 0
                    : minSelectRef.current)
        item.attr.add(
            "tab",
            isTabRow && ((tabIndex === index && !catchFocus) || isCatcher)
        )
        item.attr.addListener("onMouseDown", (e) => {
            if (!container.isMounted()) return

            setTabIndex(index)
            setCatchFocus(false)
            if (frContext) {
                frContext.setRow(rowIndex)
            }
        })
        if (isTabRow && isCatcher) {
            item.attr.addListener("onFocus", handleCatchedFocus)
        }
        if (cursor) {
            item.attr.setStyle("cursor", "pointer")
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

    let i = 0
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
        i++
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

function ButtonGroupsInner() {
    const { open, Modals } = useConfirmation()
    const items = [0, 1, 2, 3]
    const [selection, setSelection] = useState([])
    const container = useItemContainer({
        items
    })
    useFocusGroupsOnItemContainer({ container })
    useSelectionOnItemContainer({
        container,
        selection,
        setSelection,
        events: false
    })
    const elems = []
    for (const [index, entity] of items.entries()) {
        const item = container.getItem(index)
        const buttons = [
            {
                icon: "edit",
                onPressed: () => {
                    container.toggle(index)
                }
            },
            {
                icon: "delete",
                onPressed: () => {
                    open({
                        confirmed: () => {
                            d("HEY!")
                        }
                    })
                }
            },
            { icon: "arrow_right" }
        ]
        const cls = ClassNames("p-2 auto")
        cls.addIf(
            item.marked,
            "bg-active-bg text-active-text",
            "bg-input-bg text-input-text"
        )
        const elem = (
            <Div key={index} {...item.attr.props}>
                <div className="stack-h gap-2 w-full">
                    <ButtonGroup rowIndex={index} buttons={buttons} />
                    <Div
                        onMouseDown={() => container.toggle(index)}
                        className={cls.value}
                    >
                        {entity}
                    </Div>
                </div>
            </Div>
        )
        elems.push(elem)
    }

    return (
        <>
            <Div {...container.attr.props} className="stack-v gap-2 p-2 border">
                {elems}
            </Div>
            {Modals}
        </>
    )
}

function ButtonGroups(props) {
    return (
        <FocusRowCtx>
            <ButtonGroupsInner {...props} />
        </FocusRowCtx>
    )
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

function Filterbox({ filter, setFilter, toggleSortDir }) {
    const buttons = [
        {
            icon: "close",
            disabled: !filter,
            onPressed: () => setFilter("")
        }
    ]
    if (toggleSortDir) {
        buttons.push({
            icon: "sort",
            onPressed: () => toggleSortDir()
        })
    }
    return (
        <div key="filter" className="stack-h items-center gap-1">
            <div
                className={
                    "px-1" +
                    (filter === ""
                        ? ""
                        : " bg-active-bg text-active-text border border-active-text")
                }
            >
                <Icon className="text-sm" name="search" />
            </div>
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

export {
    useComponentUpdate,
    useMounted,
    useDebugMount,
    useItemContainer,
    useSelectionOnItemContainer,
    useFocusGroupsOnItemContainer,
    useFocusOnItemContainer,
    usePickerOnItemContainer,
    useGetTabIndex,
    useGetAttrWithDimProps,
    useHotKeys,
    useCallAfterwards,
    useExtractDimProps,
    useMarkInvalid,
    useConfirmation,
    useUpdateOnEntityIndexChanges,
    useErrorWindow,
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
    ListTest,
    arrowMove,
    FocusRowContext,
    FocusRowCtx
}
