import { useContext, useMemo, useRef, useState, useEffect } from "react"
import { ClassNames, d, cloneDeep, without, ucFirst } from "core/helper"
import { Button, CustomCells, FormGrid, Select } from "./form.js"
import { FILTER } from "core/filter"
import {
    arrowMove,
    NumberChip,
    Filterbox,
    useUpdateOnEntityIndexChanges,
    useItemContainer,
    useConfirmation, useErrorWindow, DualRing
} from "./common.js"
import { SetsIndex } from "entities/sets"
import { useModalWindow } from "components/modal"
import { AppContext } from "components/context"
import { Extension, ExtensionPack } from "core/extension"
import { UserSetSelectorModal, UserSetManagerModal } from "entities/sets"
import { Centered, Div, Icon } from "./layout.js"
import { Keys } from "entities/key-bindings"
import { isFunction } from "../core/helper.js"
import { TreeComponentRenderer } from "../entities/folders.js"

function useItemActionExt({ itemAction, prio = 100 } = {}) {
    return Extension({
        id: 'itemAction',
        buildApi: ({ exts }) => {
            if (itemAction) exts.setItemAction(itemAction, prio)
            return {}
        }
    })
}

function useCompactModeExt({ toolbar = "buttons" } = {}) {
    return Extension({
        id: 'compact',
        buildApi: ({ treeView }) => {
            return {
                toolbar,
                isActive: !treeView.nodes.length,
                buttonFilter: (button) => button.compact === true
            }
        }
    })
}

function useItemFocusExt() {
    return Extension({
        id: "focus",
        buildApi: ({ api, exts, treeView, treeIndex, container }) => {
            exts.addButtonsAndDivGroupProps({
                focus: true
            })
            const nodes = treeView.nodes
            const hasToggler = exts.has('toggler')
            const moveFocus = (container, x, y, shift) => {
                const { nodeType, index, closed } = nodes[container.getItemIndexForViewIndex(container.tabIndex)]
                if (hasToggler && nodeType === "folder") {
                    if ((closed && x > 0) || (!closed && x < 0)) {
                        treeIndex.toggleFolder(index)
                        return container.tabIndex
                    }
                }
                return arrowMove.prevNext(container, x, y, shift)
            }
            const focusManually = (elem) => requestAnimationFrame(() => {
                elem.dispatchEvent(
                    new MouseEvent('mousedown', { bubbles: true, cancelable: true })
                )
            })
            return {
                focusItemByViewIndex: (index) => {
                    const elem = Array.from(container.ref.current.getElementsByClassName('item-node'))[index]
                    if (!elem) return

                    focusManually(elem)
                },
                focusItemByItemIndex: (index) => {
                    const viewIndex = container.getViewIndexForItemIndex(index)
                    if (viewIndex >= 0) api.focusItemByViewIndex(viewIndex)
                },
                moveFocus
            }
        }
    })
}

function useItemCountExt({ name = "Items:" } = {}) {
    return Extension({
        id: 'count',
        tools: {
            count: ({ key, container }) => (
                <div key={key} className="stack-h gap-d2x text-xs">
                    {name && <div className="opacity-50">{name}</div>}
                    <div>{container.viewCount}/{container.count}</div>
                </div>
            )
        }
    })
}

function useCustomizationExt({ tools, getEmptyMsg } = {}) {
    return Extension({
        id: 'customTools',
        uses: ['filter', 'set'],
        tools,
        buildApi: ({ exts }) => {
            if (getEmptyMsg) {
                exts.setGetEmptyMsg(getEmptyMsg, 40)
            }
        }
    })
}

function useButtonsExt({ getButtons = () => [], name } = {}) {
    return Extension({
        id: 'action',
        tools: {
            buttons: ({ key, exts }) => {
                let buttons = getButtons(exts.plugProps)
                if (exts.has('compact') && exts.api.compact.isActive) {
                    const compactButtons = buttons.filter(exts.api.compact.buttonFilter)
                    if (compactButtons.length > 0) buttons = compactButtons
                }
                if (!buttons.length) return

                return <div key={key} className="stack-h gap-d2x text-xs items-center">
                    {name && <div className="opacity-50">{name}</div>}
                    {exts.getToolbarButtonGroup({ buttons })}
                </div>
            }
        }
    })
}

function useItemButtonsExt({ getButtons, reverse, maxButtons = 2 } = {}) {
    return Extension({
        id: 'itemActions',
        buildApi: ({ container, exts }) => {
            const disabled = container.selection && container.selection.length > 0
            exts.addButtonsAndDivGroupProps({
                reverse,
                maxButtons,
                disabled,
                focus: exts.has('focus')
            })
            return {
                getButtons
            }
        }
    })
}

function useTreeTogglerExt({ addItemAction = true, name } = {}) {
    return Extension({
        id: 'toggler',
        prepareViewParams: (viewParams) => viewParams.alwaysExpanded = false,
        buildApi: ({ api, exts, treeIndex, viewParams }) => {
            if (addItemAction) {
                exts.setItemAction( ({ node }) => api.toggle(node), 25)
            }
            return {
                toggle: (node) => node.nodeType === 'leaf' ? undefined : treeIndex.toggleFolder(node.index),
                expandAll: () => treeIndex.expandAll(viewParams.match),
                collapseAll: () => treeIndex.collapseAll(viewParams.match),
            }
        },
        tools: {
            toggler: ({ key, api, exts }) =>
                <div key={key} className="stack-h gap-d2x text-xs items-center">
                    {name && <div className="opacity-50">{name}</div>}
                    {exts.getToolbarButtonGroup({
                        key,
                        buttons: [
                            {icon: "expand_more", onPressed: api.expandAll},
                            {icon: "expand_less", onPressed: api.collapseAll}
                        ]
                    })}
                </div>
        }
    })
}

function useItemSelectionExt({
     events = true,
     min = 0,
     max,
     addItemAction = true,
     selectable,
     treeSelection,
    name = 'Selected:',
    showMarkedHidden = true,
    showMarkedOutside = true,
    ...props
} = {}) {

    const [selectionRaw, setSelectionRaw] = useState([])
    const selection = props.selection ?? selectionRaw
    const setSelection = props.setSelection ?? setSelectionRaw
    const lastSelectionRef = useRef(selection)

    return Extension({
        id: 'selection',
        prepareViewParams: viewParams => viewParams.selection = selection,
        buildApi: ({ container, exts, treeView }) => {
            container.selection = selection

            const { item2value, value2item } = container

            const isSelectableValue = (value) => {
                const index = value2item(value)
                if (index === null) return false

                return !selectable || selectable(value)
            }

            const getMinimized = (values) => {
                if (!treeSelection) return values

                const minimized = []
                let lastMarkedLevel = null
                for (const { level, nodeType, value } of container.treeOrder) {
                    if (lastMarkedLevel !== null) {
                        if (level > lastMarkedLevel) continue
                        lastMarkedLevel = null
                    }
                    const checkValue = nodeType + ' ' + value
                    if (values.includes(checkValue)) {
                        lastMarkedLevel = level
                        minimized.push(checkValue)
                    }
                }
                return minimized
            }

            const getMinSelectables = values => {
                return getMinimized(values.filter(isSelectableValue))
            }

            const syncSelection = () => {
                requestAnimationFrame(() => {
                    const newSelection = getMinSelectables(selection)
                    if (newSelection.length === selection.length) return

                    setSelection(newSelection)
                    container.refocus()
                })
            }

            const getAncestorIds = index => {
                let parents = []
                let parent = container.treeOrder[index].folder
                let i = index
                while (i >= 0) {
                    const item = container.treeOrder[i]
                    i--
                    // TODO use exact match here
                    if (item.value != parent) continue

                    parents.push("folder " + item.value)
                    parent = item.folder
                }
                return parents
            }

            const getSubtreeIdsForNode = index => {
                const { treeOrder } = container
                let i = index
                let subtreeNodes = []
                let currNode = treeOrder[i]
                const level = currNode.level
                while (true) {
                    const id = currNode.nodeType + ' ' + currNode.value
                    subtreeNodes.push(id)
                    i++
                    if (i === treeOrder.length) break

                    currNode = treeOrder[i]
                    if (currNode.level <= level) break
                }
                return subtreeNodes
            }

            const toggleSubtree = (index) => {
                const elem = container.items[index]
                const { treeOrder } = container

                let i = 0
                while (i < treeOrder.length && treeOrder[i] !== elem) i++

                if (i === treeOrder.length) return

                const entityNodes = getMinSelectables(getSubtreeIdsForNode(i))

                if (!entityNodes.length) return

                let remaining = without(selection, entityNodes)
                if (treeSelection) {
                    const parents = getAncestorIds(i)
                    remaining = without(remaining, parents)
                }
                let newSelection =
                    without(entityNodes, selection).length === 0 ?
                        [ ...remaining ] : [ ...remaining, ...entityNodes ]
                setSelection(newSelection)
            }

            const toggle = (index) => {
                const node = container.items[index]
                const value = item2value(node)
                if (selectable && !selectable(value)) return

                if (selection.includes(value)) {
                    if (selection.length > min) {
                        setSelection(without(selection, value))
                    }
                    return
                }
                if (max === 1) {
                    setSelection([value])
                } else if (max === undefined || selection.length < max) {
                    if (treeSelection) {

                        const { treeOrder } = container
                        let x = 0
                        while (x < treeOrder.length && treeOrder[x] !== node) x++

                        if (x === treeOrder.length) return

                        const subtreeIds = getSubtreeIdsForNode(x)
                        const root = subtreeIds.shift()
                        const ancestorIds = getAncestorIds(x)
                        setSelection([...without(selection, [...subtreeIds, ...ancestorIds]), root])
                        return
                    }
                    setSelection([...selection, value])
                }
            }
            exts.setItemAction(({ index }) => exts.api.selection.toggle(index), 50)

            if (lastSelectionRef.current !== selection) {
                syncSelection()
            }
            exts.setGetItemColor(
                ({ node }) => {
                    const marked = selection.includes(node.nodeType + ' ' + node.value)
                    if (marked) return "bg-active-bg text-active-text"

                    const subMarked = treeSelection && node.markedAncestor
                    if (subMarked) return "bg-active-bg/70 text-active-text"
                },
                50
            )
            if (showMarkedHidden) {
                exts.addRenderStage(
                    ({ node, key, elem }) => {
                        const { markedHidden } = node
                        if (!markedHidden) return elem

                        return(
                            <div className="stack-h auto" key={key}>
                                {elem}
                                <NumberChip value={markedHidden} icon="add_circle" />
                            </div>
                        )
                    },
                    20
                )
            }
            if (showMarkedOutside) {
                const { markedOutside } = treeView
                if (markedOutside) {
                    exts.addGetBgBottomElem(
                        2,
                        ({ key }) => <div key={key} className="stack-h px-d2x gap-x-d2x">
                            <div className="">Hidden:</div>
                            <NumberChip value={markedOutside} icon="add_circle" />
                        </div>,
                        50
                    )
                }
            }
            return {
                selection,
                setSelection,
                toggle,
                toggleSubtree,
                syncSelection,
                selectAll: () => {
                    if (max !== undefined) return

                    let allSelectables = getMinSelectables(container.items.map((x) => item2value(x)))
                    setSelection(without(allSelectables, selection).length ? allSelectables : [])
                },
                selectInverse: () => {
                    if (max !== undefined) return

                    let allSelectables = container.items.map((x) => item2value(x))
                    if (selectable) {
                        allSelectables = allSelectables.filter(x => selectable(x))
                    }
                    const invValues = []
                    for (const value of allSelectables) {
                        if (!selection.includes(value)) {
                            invValues.push(value)
                        }
                    }
                    setSelection(invValues)
                }
            }
        },
        tools: {
            selection: ({ api, key, treeView, exts }) => {
                const markedCls = new ClassNames("auto text-xs")
                markedCls.addIf(selection.length, "rounded-full bg-active-bg text-active-text px-d2x", "px-d2x")
                const buttons = [{icon: 'done_all', onPressed: () => api.selectAll()}]
                if (!treeSelection) {
                    buttons.push({
                        icon: 'star_half',
                        onPressed: () => api.selectInverse()
                    })
                }
                buttons.push({
                    icon: 'visibility',
                    disabled: treeView.markedOutside === 0,
                    onPressed: () => {
                        const inView = []
                        for (const node of treeView.nodes) {
                            const id = node.nodeType + ' ' + node.value
                            if (!node.inView || !selection.includes(id)) continue
                            inView.push(id)
                        }
                        setSelection(inView)
                    }
                })
                buttons.push({
                    icon: 'clear',
                    disabled: selection.length === 0,
                    onPressed: () => setSelection([])
                })
                return (
                    <div key={key} className="stack-h gap-x-d2x items-center">
                        <div className="stack-h gap-x-d1x text-xs">
                            {name && <div className="opacity-50">{name}</div>}
                            {name && <NumberChip value={selection.length} maxValue={treeView.nodes.length} xclassName={markedCls.value} color={selection.length} />}
                        </div>
                        {exts.getToolbarButtonGroup({ buttons })}
                    </div>
                )
            }
        }
    })
}

function useItemFilterExt({
    filterOptions = {},
    controls = 0,
    getEmptyMsg = null,
    filterInfoTop = true,
    filterInfoIcon = true
} = {}) {
    const [filter, setFilter] = useState("")
    const [caseSensitive, setCaseSensitive] = useState(filterOptions.caseSensitive ?? FILTER.DEFAULTS.caseSensitive)
    const [or, setOr] = useState(filterOptions.or ?? FILTER.DEFAULTS.or)
    const [mode, setMode] = useState(filterOptions.mode ?? FILTER.DEFAULTS.mode)

    if (getEmptyMsg === null) {
        getEmptyMsg = ({ viewParams }) => {
            return (
                <Centered>
                    No items matching filter "{viewParams.filter}"
                </Centered>
            )
        }
    }
    return Extension({
        id: 'filter',
        prepareViewParams: viewParams => {
            viewParams.filter = filter
            const currFilterOptions = viewParams.filterOptions ?? {}
            viewParams.filterOptions = {
                ...currFilterOptions,
                mode,
                caseSensitive,
                or
            }
        },
        buildApi: ({ container, exts }) => {
            if (!container.viewCount && filter) {
                exts.setGetEmptyMsg(getEmptyMsg, 80)
            }
            if (filter && filterInfoTop && container.viewCount) {
                exts.addGetBgTopElem(
                    0,
                    ({ key }) => <div key={key} className="stack-h px-d2x gap-x-d2x border-l-[7px] border-active-bg">
                        <div className="text-xs">Result filtered by "{filter}":</div>
                    </div>,
                    50
                )
            }
            return {
                filter,
                setFilter
            }
        },
        tools: {
            filter: ({ key, treeIndex }) => {
                return <Filterbox
                    key={key}
                    filter={filter}
                    setFilter={setFilter}
                    icon={filterInfoIcon}
                    toggleSortDir={() => treeIndex.toggleSortDir()}
                    caseSensitive={caseSensitive}
                    setCaseSensitive={controls & FILTER.CONTROL.CASE_SENSITIVE ? setCaseSensitive : undefined}
                    or={or}
                    setOr={controls & FILTER.CONTROL.OR ? setOr : undefined}
                    mode={mode}
                    setMode={controls & FILTER.CONTROL.MODE ? setMode : undefined}
                />
            }
        }
    })
}

function useItemSetsExt({
        name = 'Sets:', autoSets = [], persistId, userSets = false,
        getEmptyMsg = null, preventNoSetActive = false, ...props }) {
    const aContext = useContext(AppContext)

    const AddToSetModal = useModalWindow()
    const ManageSetsModal = useModalWindow()

    const paramsRef = useRef(null)

    const [userSetsData, setUserSetsDataRaw] = useState(() => {
        if (userSets && persistId) {
            return aContext.globalStorage.getJson('sets.' + persistId, {})
        }
        return {}
    })
    const setUserSetsData = (value) => {
        setUserSetsDataRaw(value)
        if (userSets && persistId) {
            aContext.globalStorage.setJson('sets.' + persistId, value)
        }
    }

    const userSetItems = useMemo(() => {
        if (!userSets) return []

        const items = []
        for (const [id, { ids, ...itemProps }] of Object.entries(userSetsData)) {
            items.push({ id, userSet: true, getHasId: () => (id) => ids.includes(id), ...itemProps })
        }
        return items
    }, [userSetsData])

    const userSetOptions = userSetItems.map(({ id, name }) => ({ id, name }))
    const [actives, setActives] = useState(props.actives ?? [])

    const items = [
        ...autoSets,
        ...userSetItems
    ]

    const id2item = {}
    const exclusives = new Set()
    for (const item of items) {
        const { id, exclusive } = item
        if (exclusive) exclusives.add(id)

        id2item[item.id] = item
    }

    const result = useMemo(() => {
        if (!actives.length) return

        let highest = FILTER.RESULT.FLAT_DIRECT
        for (const id of actives) {
            const set = id2item[id]
            // TODO: fails when active set is deleted
            if (!set.result) continue

            highest = Math.max(highest, set.result)
        }
        return highest
    }, [actives, userSetsData])

    const getInSet = (params) => {
        const checks = []
        for (const { id, getHasId } of items) {
            if (!actives.includes(id) || !getHasId) continue

            checks.push(getHasId(params))
        }
        return !checks.length ? undefined : (id) => checks.some(check => check(id))
    }

    if (getEmptyMsg === null) {
        getEmptyMsg = ({}) => {
            return (
                <Centered>
                    No items available in the selected set
                </Centered>
            )
        }
    }
    return Extension({
        id: 'sets',
        uses: ['filter', 'selection'],
        prepareViewParams: viewParams => {
            const inSet = getInSet({
                selection: viewParams.selection ?? []
            })
            const optionOverwrites = {}
            if (inSet && result) optionOverwrites.result = result
            const { filterOptions = {} } = viewParams
            viewParams.inSet = inSet
            if (inSet) {
                viewParams.filterOptions = {
                    ...filterOptions,
                    ...optionOverwrites
                }
            }
        },
        buildApi: ({ api, treeIndex, container, exts, viewParams }) => {
            const toggle = (id) => {
                if (actives.includes(id)) {
                    if (actives.length !== 1 || !preventNoSetActive) {
                        setActives(without(actives, id))
                    }
                    return
                }
                const base = actives.length === 1 && exclusives.has(actives[0]) ? [] : actives;
                setActives(exclusives.has(id) ? [id] : [...base, id])
            }

            const { filterOptions = {}, match, skip, isFilterVisible } = viewParams
            paramsRef.current = {
                treeIndex,
                filterOptions,
                match,
                skip,
                isFilterVisible
            }
            if (!container.viewCount && actives.length && getEmptyMsg) {
                exts.setGetEmptyMsg(getEmptyMsg, 50)
            }
            return {
                items,
                toggle,
                actives,
                setActives,
                result,
                userSetsAllowed: userSets,
                createUserSet: (props) => {
                    const id = 'testing'
                    const newData = cloneDeep(userSetsData)
                    newData[id] = { ...props }
                    setUserSetsData(newData)
                },
                openSetManagerModal: () => {
                    const setsIndex = new SetsIndex(userSetsData)
                    ManageSetsModal.open({
                        setsIndex,
                        treeIndex,
                        paramsRef,
                        save: (newUserSetsData) => {
                            setUserSetsData(newUserSetsData)
                            ManageSetsModal.close()
                        }
                    })
                },
                openAddToSetModal: (ids) => {
                    AddToSetModal.open({
                        options: userSetOptions,
                        save: (userSetId) => {
                            api.addIdsToUserSet(userSetId, ids)
                            AddToSetModal.close()
                        }
                    })
                },
                addIdsToUserSet: (userSetId, ids) => {
                    const set = id2item[userSetId]
                    if (!set.userSet) return

                    const newData = cloneDeep(userSetsData)
                    const dataIds = newData[userSetId].ids
                    for (const id of ids) {
                        if (dataIds.includes(id)) continue

                        dataIds.push(id)
                    }
                    setUserSetsData(newData)
                }
            }
        },
        tools: {
            sets: ({ key, api, exts }) => {
                const buttons = []
                for (const { id, name } of api.items) {
                    buttons.push(
                        {
                            name,
                            activated: true,
                            value: api.actives.includes(id),
                            onPressed: () => api.toggle(id)
                        }
                    )
                }
                if (api.userSetsAllowed) {
                    buttons.push(
                        {
                            icon: "build",
                            onPressed: () => api.openSetManagerModal(),
                        }
                    )
                }
                return <div key={key} className="flex gap-x-d2x items-center">
                    {name && <div className="text-xs opacity-50">{name}</div>}
                    {exts.getToolbarButtonGroup({ buttons })}
                </div>
            }
        },
        modals: [
            <AddToSetModal.content>
                <UserSetSelectorModal {...AddToSetModal.props} />
            </AddToSetModal.content>,
            <ManageSetsModal.content width="600px">
                <UserSetManagerModal {...ManageSetsModal.props} />
            </ManageSetsModal.content>
        ]
    })
}

function useItemSortingExt({ name = "Sort:" }) {
    const [ sorting, setSorting ] = useState(0)
    const [ dir, setDir ] = useState(1)

    return Extension({
        id: 'sorting',
        buildApi: () => {
            return {
                options: [
                    {id: 0, name: 'Alpha'},
                    {id: 1, name: 'Custom'},
                ]
            }
        },
        tools: {
            sorting: ({ key, exts }) => <div key={key} className="stack-h gap-d2x">
                {name && <div className="opacity-50">{name}</div>}
                <Select options={exts.api.sorting.options} value={sorting} set={setSorting} />
            </div>
        }
    })
}

function useUndoRedoExt({ historySize = 10, name } = {}) {
    const [backHistory, setBackHistory] = useState([])
    const [forwardHistory, setForwardHistory] = useState([])

    return Extension({
        id: 'undo',
        buildApi: ({ exts }) => {
            return {
                canProcess: (cmd) => {
                    return !!(cmd.exec && cmd.undo && cmd.redo)
                },
                updateHistory: (cmd, op) => {
                    switch (op) {
                        case 'exec':
                            setForwardHistory([])
                            setBackHistory([cmd, ...backHistory].slice(0, historySize))
                            break

                        case 'undo':
                            const [ undo, ...newBackHistory ] = backHistory
                            setForwardHistory([ undo, ...forwardHistory ].slice(0, historySize))
                            setBackHistory(newBackHistory)
                            break

                        case 'redo':
                            const [ redo, ...newForwardHistory ] = forwardHistory
                            setForwardHistory(newForwardHistory)
                            setBackHistory([ redo, ...backHistory ].slice(0, historySize))
                            break
                    }
                },
                undo: async () => {
                    if (!backHistory.length) return

                    const [ cmd ] = backHistory
                    exts.process(cmd, 'undo')
                },
                redo: async () => {
                    if (!forwardHistory.length) return

                    const [ cmd ] = forwardHistory
                    exts.process(cmd, 'redo')
                }
            }
        },
        tools: {
            undo: ({ api, key, exts }) => {
                const buttons = [
                    {
                        icon: 'undo',
                        action: {
                            hotkey: 'undo',
                            can: () => !!backHistory.length,
                            exec: () => {
                                api.undo()
                            }
                        }
                    },
                    {
                        icon: 'redo',
                        action: {
                            hotkey: 'redo',
                            can: () => !!forwardHistory.length,
                            exec: () => {
                                api.redo()
                            }
                        }
                    }
                ]
                return (
                    <div key={key} className="stack-h gap-d2x text-xs items-center">
                        {name && <div className="opacity-50">{name}</div>}
                        {exts.getToolbarButtonGroup({ buttons })}
                    </div>
                )
            }
        }
    })
}

const defaultIconRender = ({ node, exts }) => {
    const { nodeType, closed } = node
    if (nodeType === 'leaf') {
        return ''
    }
    const hasToggler = exts.has('toggler')
    const onClick = !hasToggler ? undefined : (e) => {
        exts.api.toggler.toggle(node)
        e.stopPropagation()
    }
    return (
        <div
            className="pr-d2x"
            onClick={onClick}><Icon
            name={
                nodeType === "leaf"
                    ? "arrow_right"
                    : "folder" + (closed && hasToggler ? "" : "_open")
            }
            className={nodeType === "leaf" ? "opacity-50" : ""}
        /></div>
    )
}

function LevelSpacer({ level }) {
    const px = (level - 1) * 15
    return <Div width={px + "px"} />
}

function useTreeRendererExt({ icons = true, indentation = true, iconRender = defaultIconRender, pathNames = true } = {}) {

    return Extension({
        id: 'tree',
        buildApi: ({ exts }) => {
            if (indentation) {
                exts.addRenderStage(
                    ({ key, elem, node }) => {
                        return (
                            <div key={key} className="stack-h auto pl-d2x">
                                <LevelSpacer level={node.viewLevel} />
                                {elem}
                            </div>
                        )
                    },
                    50
                )
            }
            if (icons) {
                exts.addRenderStage(
                    ({ elem, key, ...params }) => {
                        return (
                            <div key={key} className="stack-h auto">
                                <div>{iconRender(params)}</div>
                                {elem}
                            </div>
                        )
                    },
                    25
                )
            }
            if (pathNames) {
                exts.addRenderStage(
                    ({ elem, node, key }) => {
                        const { viewLevel, level, pathNames } = node
                        if (!pathNames || !(viewLevel === 1 && level > 1)) return elem

                        return (
                            <div key={key} className="stack-v auto">
                                <div className="opacity-50 text-xs">{pathNames.join(" > ")}</div>
                                {elem}
                            </div>
                        )
                    },
                    40
                )
            }
        }
    })
}

function HotkeyOverview({ hotkeys }) {
    const aContext = useContext(AppContext)

    const elems = []
    for (const [hotkey, action] of Object.entries(hotkeys)) {
        elems.push(
            <CustomCells key={hotkey} name={ucFirst(hotkey) + ':'} className="text-sm">
                <Keys value={aContext.keyBindings[hotkey]} />
            </CustomCells>
        )
    }

    return <div>
        <FormGrid>
            {elems}
        </FormGrid>
    </div>
}

function useHotkeysExt({ help = true, hotkeys = {} } = {}) {
    const aContext = useContext(AppContext)
    const HelpModal = useModalWindow()

    return Extension({
        id: 'hotkeys',
        buildApi: ({ api, exts, container }) => {

            const overwrites = {}
            if (help) {
                overwrites.help = {
                    exec: () => {
                        api.openHelpModal()
                        aContext.startExclusiveMode('help')
                        aContext.addEventListener(
                            'keyup',
                            () => {
                                aContext.endExclusiveMode('help')
                                HelpModal.close()
                            },
                            { once: true }
                        )
                    }
                }
            }
            exts.setHotkeyToolbarActions(
                { ...hotkeys, ...overwrites }
            )
            exts.setHotkeyItemActions(
                { ...overwrites }
            )
            return {
                openHelpModal: () => {
                    const isItemContext = !(container.selection && container.selection.length) && container.ref.current.contains(document.activeElement)
                    HelpModal.open({
                        hotkeys: isItemContext ? exts.hotkeyItemActions : exts.hotkeyToolbarActions,
                        transparent: true
                    })
                },
                closeHelpModal: () => {
                    HelpModal.close()
                }
            }
        },
        tools: {
            help: ({ api, key }) => <div key={key}><Button name="?" onPressed={() => api.openHelpModal()} onPressedEnd={() => api.closeHelpModal()} /></div>
        },
        modals: [
            <HelpModal.content name="Available hotkeys" closeable={false} transparent>
                <HotkeyOverview { ...HelpModal.props } />
            </HelpModal.content>
        ]
    })
}

function useItemExportExt({ name } = {}) {
    const [ state, setStateRaw ] = useState("waiting")
    const lastTimeout = useRef()
    const setState = (value) => {
        if (lastTimeout.current) {
            clearTimeout(lastTimeout.current)
            lastTimeout.current = null
        }
        setStateRaw(value)
        if (value !== 'waiting') {
            lastTimeout.current = setTimeout(
                () => {
                    setState('waiting')
                },
                2500
            )
        }
    }

    const state2name = {
        waiting: '➔',
        failed: '✖',
        ready: '✔'
    }
    return Extension({
        id: 'export',
        buildApi: ({ treeView, container }) => {
            return {
                doExport: async () => {
                    try {
                        if (!navigator.clipboard) throw Error(`No clipboard API supported`)

                        const lines = []
                        const skip = container.selection && container.selection.length ?
                            (node) => !container.selection.includes(node.nodeType + ' ' + node.value) :
                            (node) => node.visible === false

                        for (const node of treeView.nodes) {
                            if (skip(node)) continue

                            lines.push(node.name)
                        }
                        await navigator.clipboard.writeText(lines.join('\r\n'))
                        setState('ready')
                    } catch (e) {
                        console.error(e)
                        setState('failed')
                    }
                }
            }
        },
        tools: {
            export: ({ exts, api, key }) => {
                return (
                    <div key={key} className="stack-h gap-d2x text-xs items-center">
                        {name && <div className="opacity-50">{name}</div>}
                        {exts.getToolbarButtonGroup({
                                key,
                                buttons: [
                                    {
                                        icon: 'content_paste',
                                        name: state2name[state],
                                        reverse: true,
                                        width: '40px',
                                        colored: state !== 'ready',
                                        className: state === 'ready' ? 'bg-emerald-800/50 text-slate-200' : undefined,
                                        invalid: state === 'failed',
                                        action: {
                                            hotkey: 'export',
                                            exec: () => {
                                                exts.process({
                                                    block: false,
                                                    exec: async () => await api.doExport()
                                                })
                                            }
                                        }
                                    }
                                ]
                            })
                        }
                    </div>
                )
            }
        }
    })
}

function useModelSnapshotExt({ getSnapshot, always = false } = {}) {
    if (!getSnapshot) {
        getSnapshot = ({ treeIndex }) => {
            return d({
                leaf: cloneDeep(treeIndex.leafIndex.model),
                folder: cloneDeep(treeIndex.folderIndex.model)
            })
        }
    }

    return Extension({
        id: 'snapshot',
        buildApi: ({ api, treeIndex, exts }) => {
            return {
                getSnapshot: async () => getSnapshot(exts.plugProps),
                getRestore: async () => {
                    const snapshot = await api.getSnapshot()
                    return () => {
                        treeIndex.leafIndex.setModel(snapshot.leaf, false)
                        treeIndex.folderIndex.setModel(snapshot.folder, true)
                    }
                },
                getRestoreForCmd: async (cmd) => {
                    if (!always && !cmd.snapshot) return

                    if (cmd.getRestore) return await cmd.getRestore()

                    return await api.getRestore()
                }
            }
        }
    })
}

function BlockingInformation({ msg = 'loading...', abort }) {
    const [ aborted, setAborted ] = useState(false)
    return (
        <Div className="p-2 text-center" width="200px">
            <div className="stack-v text-center text-xs justify-center gap-2">
                <div>{aborted ? 'Aborting...' : msg}</div>
                <div className="text-center"><DualRing size={20} className="after:border-1" /></div>
                {abort && <div><Button name="Abort" autoFocus onPressed={() => {
                    setAborted(true)
                    abort()
                }} disabled={aborted} /></div>}
            </div>
        </Div>)
}

function useUiBlockingExt({ msg = 'Executing...' } = {}) {
    const BlockingModal = useModalWindow()

    return Extension({
        id: 'blocking',
        buildApi: ({  }) => {
            return {
                startBlocking: (abort) => {
                    BlockingModal.open({ abort })
                },
                stopBlocking: () => {
                    BlockingModal.close()
                }
            }
        },
        modals: [
            <BlockingModal.content>
                <BlockingInformation {...BlockingModal.props} msg={msg} />
            </BlockingModal.content>
        ]
    })
}

function useItemManagerExt() {
}

function usePaginationExt() {
}

function useItemDragExt() {
}

function useReorderExt() {
}

function useUnrenderedTreeComponent({ treeIndex, match, skip, extensions = [], header = '', footer = '' }) {

    const aContext = useContext(AppContext)
    const ConfirmModal = useConfirmation()

    const ErrorWindow = useErrorWindow()
    const areaRef = useRef(null)
    useUpdateOnEntityIndexChanges(treeIndex)
    const hotkeyActionsRef = useRef({
        itemActions: {},
        toolbarActions: {}
    })

    const exts = new ExtensionPack(...extensions)
    exts.hotkeyActions = hotkeyActionsRef.current
    const extIds = useMemo(() => {
        return exts.getSortedIds()
    }, [])

    let viewParams = {
        alwaysExpanded: true,
        match,
        skip
    }
    exts.prepareViewParams(extIds, viewParams)
    const treeView = treeIndex.getNodes(viewParams)
    const { treeOrder, nodes } = treeView
    const extsRef = useRef(null)

    const container = useItemContainer({
        view: true,
        treeOrder,
        items: nodes,
        item2value: x => `${x.nodeType} ${x.value}`,
        value2item: (x) => {
            const [ type, value ] = x.split(" ", 2)
            const indexName = type === "folder" ? "folderIndex" : "leafIndex"

            return treeIndex[indexName].getEntityByPropValue('value', value)
        }
    })
    extsRef.current = exts
    const plugProps = {
        treeIndex,
        treeView,
        viewParams,
        exts,
        container
    }

    if (exts.has('hotkeys')) {
        // TODO move this to the hotkeys extension
        const hotkeyListener = (e) => {
            if (e.repeat) return

            const actionKey = aContext.getHotkeyFromEvent(e)
            if (!actionKey) return

            const hotkey = aContext.hotKeyActions.hotKey2action[actionKey]
            if (!hotkey) return

            const { container, treeView, exts } = extsRef.current.plugProps

            const isFocusWithinContainer = (window.document.activeElement && container.ref.current.contains(window.document.activeElement))

            const isToolbarAction = !isFocusWithinContainer || (container.selection && container.selection.length)

            let action
            let params = []
            let callback
            if (isToolbarAction) {
                action = extsRef.current.hotkeyToolbarActions[hotkey]
            } else {
                const index = exts.has('itemActions') ? container.row : container.tabIndex
                params.push(treeView.nodes[index])
                action = extsRef.current.hotkeyItemActions[hotkey]
                callback = () => exts.api.focus.focusItemByViewIndex(index)
            }
            if (!action) return
            const { can, exec, confirm } = action

            if (can && !can(...params)) return

            const doExec = () => {
                exec(...params)
                if (callback) requestAnimationFrame(callback)
            }
            if (confirm) {
                exts.doConfirmed(isFunction(confirm) ? confirm(...params) : confirm, () => doExec())
            } else {
                doExec()
            }
        }
        useEffect(
            () => {
                areaRef.current.addEventListener('keydown', hotkeyListener)
            },
            []
        )
    }

    exts.plugProps = plugProps
    exts.addModal(ConfirmModal.Modals)
    exts.addModal(ErrorWindow.Modal)
    exts.doConfirmed = (msg, confirmed) => ConfirmModal.open({ msg, confirmed })
    exts.init(extIds)

    exts.errorHandler = async () => {
        ErrorWindow.open({message: `The execution failed!`})
    }

    const clickAction = exts.itemAction
    if (clickAction) {
        container.addItemBuilder((index, item) => {
            item.attr.addListener("onClick", () => {
                const node = container.items[index]
                const id = node.nodeType + ' ' + node.value
                clickAction({ id, index, node, ...plugProps })
            })
            item.attr.addListener('onKeyDown', e => {
                if (e.key === " ") {
                    const node = container.items[index]
                    const id = node.nodeType + ' ' + node.value
                    clickAction({ id, index, node, ...plugProps })
                    e.preventDefault()
                }
            })
        })
    }

    return {
        ...plugProps,
        header,
        footer,
        areaRef
    }
}

function useTreeComponent({ treeIndex, match, skip, extensions, header, footer, ...props }) {
    const tree = useUnrenderedTreeComponent({ treeIndex, match, skip, extensions, header, footer })
    return <TreeComponentRenderer tree={tree} { ...props } />
}

export {
    useUnrenderedTreeComponent,
    useTreeComponent,

    useTreeRendererExt,
    useCompactModeExt,
    useItemFocusExt,
    useButtonsExt,
    useItemActionExt,
    useItemButtonsExt,
    useTreeTogglerExt,
    useItemSelectionExt,
    useItemFilterExt,
    useItemSetsExt,
    useItemSortingExt,
    useItemCountExt,
    useItemExportExt,
    useUndoRedoExt,
    usePaginationExt,
    useItemDragExt,
    useReorderExt,
    useItemManagerExt,
    useCustomizationExt,
    useHotkeysExt,
    useModelSnapshotExt,
    useUiBlockingExt
}