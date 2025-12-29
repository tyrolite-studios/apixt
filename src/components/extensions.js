import { useContext, useMemo, useRef, useState, useEffect } from "react"
import { OVERFLOW, clamp, getNewModelId, isInRange, ClassNames, cloneDeep, without, ucFirst, isFunction } from "core/helper"
import { ButtonGroup, Button, CustomCells, FormGrid, Number, Select } from "./form.js"
import { FILTER } from "core/filter"
import { NumberChip, Filterbox, DualRing, useCallAfterwards, FOCUS_EVENTS } from "./common.js"
import { SetsIndex } from "entities/sets"
import { useModalWindow } from "components/modal"
import { AppContext } from "components/context"
import { Extension, EXT_TYPE, EXT_SKIP } from "core/extension"
import { UserSetSelectorModal, UserSetManagerModal } from "entities/sets"
import { Centered, Div, Icon } from "./layout.js"
import { Keys } from "entities/key-bindings"
import { getWords, isSearchWordsMatch } from "core/filter"

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
        buildApi: ({ view }) => {
            return {
                toolbar,
                isActive: !view.totalCount,
                buttonFilter: (button) => button.compact === true
            }
        }
    })
}

// TODO tree-handling
function useItemFocusExt({ overflow = OVERFLOW.WRAP } = {}) {
    return Extension({
        id: "focus",
        buildApi: ({ api, exts, container }) => {
            container.overflow = overflow
            exts.addButtonsAndDivGroupProps({
                focus: true
            })
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
                }
            }
        }
    })
}

function useItemCountExt({ name = "Items:" } = {}) {
    return Extension({
        id: 'count',
        tools: {
            count: ({ key, view }) => (
                <div key={key} className="stack-h gap-d2x text-xs">
                    {name && <div className="opacity-50">{name}</div>}
                    <div>{view.pageCount}/{view.viewCount}/{view.viewVisibleCount}</div>
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

function toggleValue(values, value) {
    if (values.includes(value)) {
        return values.toSpliced(values.indexOf(value), 1)
    }
    return [...values, value]
}

function toggleValues(allValues, values) {
    const deleteValues = []
    const addValues = []
    for (const value of values) {
        if (allValues.includes(value)) {
            deleteValues.push(value)
        } else {
            addValues.push(value)
        }
    }
    return [...without(allValues, deleteValues), ...addValues]
}

function useTreeTogglerExt({ addItemAction = true, name } = {}) {
    const [ closed, setClosed ] = useState([])
    return Extension({
        id: 'toggler',
        types: [EXT_TYPE.TREE],
        prepareViewParams: (viewParams) => {
            viewParams.temp.closedLevel = null
            viewParams.temp.closedParent = null
            viewParams.alwaysExpanded = false
        },
        viewBuildProps: (node, { temp }) => {
            let closedLevel = temp.closedLevel
            let isClosed = false
            if (closedLevel !== null && node.viewLevel <= closedLevel) {
                closedLevel = null
            }
            if (closedLevel === null) {
                isClosed = closed.includes(node.id)
                if (isClosed && !node.skip) {
                    closedLevel = node.viewLevel
                    temp.closedParent = node
                }
            } else {
                node.skip |= EXT_SKIP.HIDDEN
            }
            node.closed = isClosed
            temp.closedLevel = closedLevel
        },
        buildApi: ({ api, exts, view, container }) => {
            if (addItemAction) {
                exts.setItemAction( ({ node }) => api.toggle(node), 25)
            }
            const toggle = (node) => {
                if (!node.isContainer) return

                setClosed(toggleValue(closed, node.id))
            }
            if (!exts.has('itemActions')) {
                container.naviRef.current.setKeyEvents(
                    {
                        'ArrowLeft': (focusIndex) => {
                            const node = container.items[focusIndex]
                            if (node.isContainer && !node.closed) {
                                toggle(node)
                                return
                            }
                            return FOCUS_EVENTS.X_PREV
                        },
                        'ArrowRight': (focusIndex) => {
                            const node = container.items[focusIndex]
                            if (node.isContainer && node.closed) {
                                toggle(node)
                                return
                            }
                            return FOCUS_EVENTS.X_NEXT
                        }
                    },
                    55
                )
            }
            return {
                toggle,
                expandAll: () => setClosed([]),
                collapseAll: () => {
                    const ids = []
                    for (const node of view.nodes) {
                        if (!node.isContainer || node.closed) continue

                        ids.push(node.id)
                    }
                    setClosed(toggleValues(closed, ids))
                },
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
    syncing = false,
    name = 'Selected:',
    showMarkedHidden = true,
    showMarkedOutside = true,
    ...props
} = {}) {

    const [ selectionRaw, setSelectionRaw ] = useState([])
    const selection = props.selection ?? selectionRaw
    const setSelection = props.setSelection ?? setSelectionRaw
    const lastSelectionRef = useRef(selection)

    return Extension({
        id: 'selection',
        uses: ['toggler'],
        prepareViewParams: viewParams => {
            viewParams.selection = selection
            viewParams.temp.markedLevel = null
        },
        viewBuildProps: (node, { temp }) => {
            let { markedLevel } = temp
            if (markedLevel !== null && node.level <= markedLevel) {
                markedLevel = null
            }
            if (markedLevel) {
                node.markedAncestor = true
            } else {
                node.markedAncestor = false
                if (selection.includes(node.id)) {
                    markedLevel = node.level
                }
            }
            temp.markedLevel = markedLevel
            if (temp.closedLevel === undefined) return

            const closedLevel = temp.closedLevel
            const closedParent = temp.closedParent
            if (closedLevel !== null && closedParent && node !== closedParent && selection.includes(node.id)) {
                closedParent.markedHidden = (closedParent.markedHidden ?? 0) + 1
            } else {
                node.markedHidden = 0
            }
        },
        finalizeView(view, { allNodes, viewParams }) {
            const { startIndex, endIndex } = viewParams
            let markedOutside = 0
            let markedPrev = 0
            let markedNext = 0

            for (const node of allNodes) {
                if (!node.skip) continue

                if (selection.includes(node.id)) {
                    if (node.skip === EXT_SKIP.PAGE) {
                        if (node.viewIndex < startIndex) {
                            markedPrev++
                        } else if (node.viewIndex > endIndex) {
                            markedNext++
                        }
                    }  else if (node.skip !== EXT_SKIP.HIDDEN) {
                        markedOutside++
                    }
                }
            }
            view.markedOutside = markedOutside
            view.markedPrev = markedPrev
            view.markedNext = markedNext
        },
        buildApi: ({ container, exts, view }) => {
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
                for (const { level, id } of view.allNodes) {
                    if (lastMarkedLevel !== null) {
                        if (level > lastMarkedLevel) continue

                        lastMarkedLevel = null
                    }
                    if (values.includes(id)) {
                        lastMarkedLevel = level
                        minimized.push(id)
                    }
                }
                return minimized
            }

            const getMinSelectables = values => {
                return getMinimized(values.filter(isSelectableValue))
            }

            const syncSelection = () => {
                if (!syncing) return

                requestAnimationFrame(() => {
                    const newSelection = getMinSelectables(selection)
                    if (newSelection.length === selection.length) return

                    setSelection(newSelection)
                    container.refocus()
                })
            }

            const getAncestorIds = index => {
                let parents = []
                let parent = view.allNodes[index].parent
                let i = index
                while (i >= 0) {
                    const item = view.allNodes[i]
                    i--
                    if (item.id !== parent) continue

                    parents.push(item.id)
                    parent = item.parent
                }
                return parents
            }

            const getSubtreeIdsForNode = index => {
                const { allNodes } = view
                let i = index
                let subtreeNodes = []
                let currNode = allNodes[i]
                const level = currNode.level
                while (true) {
                    subtreeNodes.push(currNode.id)
                    i++
                    if (i === allNodes.length) break

                    currNode = allNodes[i]
                    if (currNode.level <= level) break
                }
                return subtreeNodes
            }

            const toggleSubtree = (index) => {
                const elem = container.items[index]
                const { allNodes } = view

                let i = 0
                while (i < allNodes.length && allNodes[i] !== elem) i++

                if (i === allNodes.length) return

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
                        const { allNodes } = view
                        let x = 0
                        while (x < allNodes.length && allNodes[x] !== node) x++

                        if (x === allNodes.length) return

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
                    const marked = selection.includes(node.id)
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
                const { markedOutside, markedPrev, markedNext } = view
                if (markedPrev) {
                    exts.addGetBgBottomElem(
                        0,
                        ({ key }) => <div key={key} className="stack-h px-d2x gap-x-d2x">
                            <div className="">Prev:</div>
                            <NumberChip value={markedPrev} icon="add_circle" />
                        </div>,
                        50
                    )
                }
                if (markedOutside) {
                    exts.addGetBgBottomElem(
                        1,
                        ({ key }) => <div key={key} className="stack-h px-d2x gap-x-d2x">
                            <div className="">Hidden:</div>
                            <NumberChip value={markedOutside} icon="add_circle" />
                        </div>,
                        50
                    )
                }
                if (markedNext) {
                    exts.addGetBgBottomElem(
                        2,
                        ({ key }) => <div key={key} className="stack-h px-d2x gap-x-d2x">
                            <div className="">Next:</div>
                            <NumberChip value={markedNext} icon="add_circle" />
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
            selection: ({ api, key, view, exts }) => {
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
                    disabled: view.markedOutside === 0,
                    onPressed: () => {
                        const inView = []
                        for (const node of view.nodes) {
                            if (!node.visible || !selection.includes(node.id)) continue
                            inView.push(node.id)
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
                            {name && <NumberChip value={selection.length} maxValue={view.nodes.length} color={!!selection.length} />}
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
    filterInfoIcon = true,
    isFilterRelevant = () => true,
    isFilterVisible = () => true
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
    let isTreeComponent = false
    return Extension({
        id: 'filter',
        uses: ['sets'],
        prepareViewParams: viewParams => {
            viewParams.filter = filter
            viewParams.filterOptions = {
                ...filterOptions,
                mode,
                caseSensitive,
                or
            }
            isTreeComponent = viewParams.componentType === EXT_TYPE.TREE
        },
        finalizeViewParams: viewParams => {
            const { caseSensitive, result } = viewParams.filterOptions
            viewParams.cacheBaseBy.push(caseSensitive)
            viewParams.temp.searchWords = filter ? getWords(filter, !caseSensitive) : []
            viewParams.temp.matchLevel = null
            if (result === FILTER.RESULT.WITH_ANCESTORS) {
                viewParams.skipNodesAfterBuild = true
            }
            viewParams.postSorting = viewParams.filter && isTreeComponent && result === FILTER.RESULT.FLAT_DIRECT
        },
        viewPreProps: (node, { entityIndex }) => {
            node.words = [entityIndex.getEntityFilterString(node.index)]
        },
        viewBuildProps: (node, { viewParams, temp, allNodes }) => {
            const { result } = viewParams.filterOptions
            node.viewLevel = node.level
            if (!filter && !viewParams.inSet) return

            if (isTreeComponent) {
                let { matchLevel } = temp
                if (matchLevel !== null && node.level <= matchLevel) {
                    matchLevel = null
                    temp.matchLevel = null
                }
                if (matchLevel !== null) {
                    switch (result) {
                        case FILTER.RESULT.FLAT_SUBTREES:
                            node.viewLevel = 1
                            break

                        case FILTER.RESULT.SUBTREES:
                            node.viewLevel -= (matchLevel - 1)
                            break
                    }
                    return
                }
            }
            const isInSet = !viewParams.inSet ? false : viewParams.inSet(node.id)
            if (isInSet || (isFilterRelevant(node) && isSearchWordsMatch(temp.searchWords, node.words, viewParams.filterOptions) && isFilterVisible(node))) {
                if (isTreeComponent) {
                    if (result === FILTER.RESULT.WITH_ANCESTORS) {
                        let index = temp.baseIndex - 1
                        const ancestors = [ ...node.ancestors ]
                        let nextAncestor = ancestors.pop()
                        while (nextAncestor !== undefined && index >= 0) {
                            const ancestorNode = allNodes[index]
                            if (ancestorNode.id === nextAncestor) {
                                if (ancestorNode.skip === 0) break

                                ancestorNode.skip = 0
                                nextAncestor = ancestors.pop()
                            }
                            index--
                        }
                    } else {
                        node.viewLevel = 1
                    }
                    if (result !== FILTER.RESULT.FLAT_DIRECT) {
                        temp.matchLevel = node.level
                    }
                }
                return
            }
            node.skip |= EXT_SKIP.FILTER
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
            filter: ({ key }) => {
                return <Filterbox
                    key={key}
                    className="text-xs"
                    filter={filter}
                    setFilter={setFilter}
                    icon={filterInfoIcon}
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

// TODO list-handling
function useItemSetsExt({
        name = 'Sets:', autoSets = [], persistId, userSets = false,
        getEmptyMsg = null, preventNoSetActive = false, ...props } = {}) {
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

    const checks = []
    const getInSet = (params) => {
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

    let inSet = null
    return Extension({
        id: 'sets',
        uses: ['selection'],
        finalizeViewParams(viewParams) {
            if (!actives.length) return

            inSet = getInSet({
                selection: viewParams.selection ?? []
            })
            viewParams.filterOptions.result = result
            viewParams.temp.matchLevelSet = null
        },
        viewBuildProps: (node, { temp }) => {
            if (!actives.length) return

            let { matchLevelSet } = temp
            if (matchLevelSet !== null && node.level <= matchLevelSet) {
                matchLevelSet = null
                temp.matchLevelSet = null
            }
            if (matchLevelSet !== null) {
                return
            }
            if (inSet(node.id)) {
                if (result !== FILTER.RESULT.FLAT_DIRECT) {
                    temp.matchLevelSet = node.level
                }
                return
            }
            node.skip |= EXT_SKIP.FILTER
        },
        buildApi: ({ api, entityIndex, container, exts, viewParams }) => {
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
                entityIndex,
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
                    const id = getNewModelId()
                    const newData = cloneDeep(userSetsData)
                    newData[id] = { ...props }
                    setUserSetsData(newData)
                },
                openSetManagerModal: () => {
                    const setsIndex = new SetsIndex(userSetsData)
                    ManageSetsModal.open({
                        setsIndex,
                        entityIndex,
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

// TODO: custom sorting order
function useItemSortingExt({ name = "Sort:", options } = {}) {
    const [ sorting, setSorting ] = useState(0)
    const [ asc, setAsc ] = useState(true)

    let cachedOptions = null
    const buildOptions = (entityIndex) => {
        const entityOptions = entityIndex.getSortOptions()
        const sortOptions = []
        if (!options) {
            return entityOptions.map((obj, index) => ({ ...obj, id: index }))
        }

        for (const [ index, option ] of options.entries()) {
            const { id, name } = option
            const item = entityOptions.find(option => option.id === id)
            if (!item) throw Error(`Sorting with id "${id}" not found in entityIndex`)

            sortOptions.push({ id: index, name: name ?? item.name, getSort: item.getSort })
        }
        return sortOptions
    }

    const getOptions = (entityIndex) => {
        if (cachedOptions) return cachedOptions

        cachedOptions = buildOptions(entityIndex)
        return cachedOptions
    }

    return Extension({
        id: 'sorting',
        prepareViewParams(viewParams) {
            viewParams.sorting = sorting
            viewParams.asc = asc
        },
        finalizeViewParams(viewParams) {
            viewParams.cacheBaseBy.push(
                viewParams.sorting,
                viewParams.asc
            )
        },
        getBaseSort: ({ entityIndex, viewParams }, postSort) => {
            const showOptions = getOptions(entityIndex)
            return showOptions[sorting].getSort(viewParams.asc, postSort)
        },
        buildApi: ({ entityIndex }) => {
            const options = getOptions(entityIndex)
            return {
                options,
                sorting,
                setSorting,
                asc,
                toggleDir: () => setAsc(!asc)
            }
        },
        tools: {
            sorting: ({ key, api }) => <div key={key} className="stack-h gap-d2x items-center text-xs">
                {name && <div className="opacity-50">{name}</div>}
                {
                    api.options.length > 1 &&
                    <Select options={api.options} value={sorting} set={setSorting} />
                }
                <Button icon="sort" flipY={asc} onPressed={api.toggleDir} />
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
    const { isContainer, closed } = node
    if (!isContainer) {
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
                !isContainer
                    ? "arrow_right"
                    : "folder" + (closed && hasToggler ? "" : "_open")
            }
            className={isContainer ? "opacity-50" : ""}
        /></div>
    )
}

function LevelSpacer({ level }) {
    const px = (level - 1) * 15
    return <Div width={px + "px"} />
}

function useTreeRendererExt({ icons = true, indentation = true, iconRender = defaultIconRender, ancestorNames = true } = {}) {

    return Extension({
        id: 'tree',
        types: [EXT_TYPE.TREE],
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
            if (ancestorNames) {
                exts.addRenderStage(
                    ({ elem, node, key }) => {
                        const { viewLevel, level, ancestorNames } = node
                        if (!ancestorNames || !(viewLevel === 1 && level > 1)) return elem

                        return (
                            <div key={key} className="stack-v auto">
                                <div className="opacity-50 text-xs">{ancestorNames.join(" > ")}</div>
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
    const extsRef = useRef(null)
    const hotkeyActionsRef = useRef({
        itemActions: {},
        toolbarActions: {}
    })
    const hotkeyListener = (e) => {
        if (e.repeat) return

        const actionKey = aContext.getHotkeyFromEvent(e)
        if (!actionKey) return

        const hotkey = aContext.hotKeyActions.hotKey2action[actionKey]
        if (!hotkey) return

        const { container, view, exts } = extsRef.current.plugProps

        const isFocusWithinContainer = (window.document.activeElement && container.ref.current.contains(window.document.activeElement))

        const isToolbarAction = !isFocusWithinContainer || (container.selection && container.selection.length)

        let action
        let params = []
        let callback
        if (isToolbarAction) {
            action = extsRef.current.hotkeyToolbarActions[hotkey]
        } else {
            // TODO: tabIndex hier checken, wird falsch sein, wenn pageOffset
            const index = exts.has('itemActions') ? container.row : container.tabIndex
            params.push(view.nodes[index])
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
    return Extension({
        id: 'hotkeys',
        events: {
            keydown: hotkeyListener
        },
        buildApi: ({ api, exts, container }) => {
            extsRef.current = exts
            exts.hotkeyActions = hotkeyActionsRef.current
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
        buildApi: ({ view, container }) => {
            return {
                doExport: async () => {
                    try {
                        if (!navigator.clipboard) throw Error(`No clipboard API supported`)

                        const lines = []
                        const skip = container.selection && container.selection.length ?
                            (node) => !container.selection.includes(node.nodeType + ' ' + node.value) :
                            (node) => node.visible === false

                        for (const node of view.nodes) {
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

// TODO list-handling
function useModelSnapshotExt({ getSnapshot, always = false } = {}) {
    if (!getSnapshot) {
        getSnapshot = ({ treeIndex }) => {
            return {
                leaf: cloneDeep(treeIndex.leafIndex.model),
                folder: cloneDeep(treeIndex.folderIndex.model)
            }
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

function usePaginationExt({ name = 'Page:', itemsPerPage = 100 } = {}) {
    const [ page, setPage ] = useState(1)
    const callAfterwards = useCallAfterwards()

    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage - 1
    return Extension({
        id: 'pagination',
        types: [EXT_TYPE.LIST, EXT_TYPE.TABLE],
        prepareViewParams(viewParams) {
            viewParams.startIndex = startIndex
            viewParams.endIndex = endIndex
        },
        viewPostProps: (index, node) => {
            if (node.skip || isInRange(index, startIndex, endIndex)) return

            node.skip = EXT_SKIP.PAGE
        },
        buildApi: ({ view, viewParams, container }) => {
            const maxPage = Math.ceil(view.viewCount / itemsPerPage)

            container.pageIndexStart = viewParams.startIndex
            container.pageIndexEnd = viewParams.endIndex
            container.viewToFocusIndex = (viewIndex) => {
                const newPage = Math.floor(viewIndex / itemsPerPage) + 1
                if (newPage !== page) {
                    setPage(newPage)
                }
                return viewIndex - ((newPage - 1) * itemsPerPage)
            }
            const disabled = view.viewCount === 0
            if (page > maxPage) callAfterwards(setPage, disabled ? 1 : maxPage)
            return {
                disabled,
                page,
                setPage,
                firstPage: () => {
                    setPage(1)
                },
                lastPage: () => {
                    setPage(maxPage)
                },
                nextPage: () => {
                    setPage(page === maxPage ? 1 : page + 1)
                },
                prevPage: () => {
                    setPage(page === 1 ? maxPage : page - 1)
                },
                maxPage
            }
        },
        tools: {
            pagination: ({ key, api }) => {
                const { disabled } = api
                const prevButtons = [
                    {icon: 'first_page', onPressed: () => api.firstPage(), disabled},
                    {icon: 'keyboard_arrow_left', onPressed: () => api.prevPage(), disabled}
                ]
                const nextButtons = [
                    {icon: 'keyboard_arrow_right', onPressed: () => api.nextPage(), disabled},
                    {icon: 'last_page', onPressed: () => api.lastPage(), disabled}
                ]
                return <div key={key} className="stack-h gap-2 text-xs items-center">
                    <div className="opacity-50">{name}</div>
                    <div className="stack-h gap-2 items-center">
                        <ButtonGroup buttons={prevButtons} />
                        <div><Number className="text-xs" value={api.disabled ? 1 : page} min={1} max={api.disabled ? 1 : api.maxPage} set={setPage} /></div>
                        <div>/ {api.disabled ? 1 : api.maxPage}</div>
                        <ButtonGroup buttons={nextButtons} />
                    </div>
                </div>
            }
        }
    })
}

function useInfiniteScrollingExt({
     startItems = 25, addItems = 10, fixHeight = false, loadItemsWhileDragging = false, name = 'Loading...', switchDirection = true } = {}
) {
    const [ loaded, setLoaded ] = useState(startItems)
    const [ upwards, setUpwards ] = useState(false)
    const sentinelRef = useRef(null)
    const containerRef = useRef(null)
    const countRef = useRef(null)
    const mouseDownRef = useRef(false)
    const postponedRef = useRef(null)

    const getScrollElem = () => {
        let elem = sentinelRef.current
        while (elem && !elem.classList.contains('overflow-y-auto')) {
            elem = elem.parentNode
        }
        return elem
    }

    useEffect(() => {
        if (loadItemsWhileDragging) return

        const downListener = e => {
            mouseDownRef.current = true
        }
        const upListener = e => {
            mouseDownRef.current = false
            if (postponedRef.current) {
                postponedRef.current()
                postponedRef.current = null
            }
        }
        document.addEventListener('mousedown', downListener)
        document.addEventListener('mouseup', upListener)
        return () => {
            document.removeEventListener('mousedown', downListener)
            document.removeEventListener('mouseup', upListener)
        }
    }, [])

    useEffect(() => {
        const elem = getScrollElem()
        if (!elem) return

        const viewportHeight = elem.clientHeight
        const loadMore = () => {
            setLoaded(loaded + addItems)
            if (upwards) {
                const navi = containerRef.current.naviRef.current
                const oldTabIndex = navi.getFocusIndex(1)
                // TODO only if itemFocus extension?
                navi.setFocusIndex(1, Math.max(0, oldTabIndex + addItems))
                if (navi.isKeyPressed()) return

                const distanceFromBottom =
                    elem.scrollHeight - elem.scrollTop - elem.clientHeight

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        elem.scrollTop =
                            elem.scrollHeight - elem.clientHeight - distanceFromBottom
                    })
                })
            }
        }
        const observer = new IntersectionObserver(
            entries => {
                if (!entries.length || !entries[0].isIntersecting) return

                if (!mouseDownRef.current || loadItemsWhileDragging) {
                   loadMore()
                } else {
                    postponedRef.current = loadMore
                }
            },
            {
                root: elem,
                rootMargin: `${viewportHeight * 2}px`
            }
        )
        observer.observe(sentinelRef.current)
        return () => observer.disconnect()
    }, [ loaded, upwards, countRef.current, sentinelRef.current ])

    return Extension({
        id: 'infinite',
        prepareViewParams(viewParams) {
            if (!upwards) return

            viewParams.requireTotalInPostProps = true
        },
        viewPostProps: (index, node, max) => {
            if (node.skip || isInRange(index, upwards ? Math.max(0, max - loaded) : 0, upwards ? max - 1 : loaded - 1)) return

            node.skip = EXT_SKIP.PAGE
        },
        buildApi: ({ exts, view, container }) => {
            if (exts.has('pagination')) throw Error('Infinite scrolling extension cannot be used with the pagination extension!')

            container.pageIndexStart = upwards ? view.viewCount - loaded : 0
            container.pageIndexEnd = upwards ? view.viewCount - 1 : loaded - 1

            const toggleDirection = (value) => {
                if (!switchDirection || value === upwards) return false

                const newUpwards = !upwards
                setUpwards(newUpwards)
                setLoaded(startItems)

                const elem = getScrollElem()
                if (!elem) return true

                if (newUpwards) {
                    elem.scrollTop = elem.scrollHeight
                } else {
                    elem.scrollTop = 0
                }
                return true
            }

            container.viewToFocusIndex = (viewIndex) => {
                let newLoaded = loaded

                if (upwards) {
                    while (view.viewCount - newLoaded > viewIndex) newLoaded += addItems
                } else {
                    while (newLoaded < viewIndex) newLoaded += addItems
                }
                newLoaded = clamp(0, newLoaded, view.viewCount)

                if (newLoaded === loaded) return (
                    upwards ?
                        viewIndex - (view.viewCount - newLoaded) :
                        viewIndex
                )

                if (switchDirection) {
                    if (upwards && newLoaded > (view.viewCount - startItems)) {
                        toggleDirection(false)
                        return viewIndex
                    } else if (!upwards && newLoaded > (view.viewCount - startItems)) {
                        toggleDirection(true)
                        return viewIndex - (view.viewCount - startItems)
                    }
                }
                setLoaded(newLoaded)

                return upwards ? viewIndex - (view.viewCount - newLoaded) - 1 : viewIndex
            }

            containerRef.current = container
            if (countRef.current === null) {
                countRef.current = view.viewVisibleCount
            } else if (loaded !== startItems && countRef.current !== view.viewVisibleCount) {
                if (!toggleDirection(false)) {
                    setLoaded(startItems)
                }
            }
            countRef.current = view.viewVisibleCount

            if (loaded < view.viewVisibleCount) {
                if (upwards) {
                    exts.addGetBgTopElem(
                        1,
                        ({ }) => <Div ref={sentinelRef} key="topSentinel" className="stack-h px-d2x gap-x-d2x">
                            <div className="">{name}</div>
                        </Div>,
                        50
                    )

                } else {
                    exts.addGetBgBottomElem(
                        1,
                        ({ }) => <Div ref={sentinelRef} key="bottomSentinel" className="stack-h px-d2x gap-x-d2x">
                            <div className="">{name}</div>
                        </Div>,
                        50
                    )
                }
            }
            return {
                toggleDirection
            }
        },
    })
}

function useVirtualizationExt({ }) {
    return Extension({
        id: 'virtualization',
    })
}

function useItemManagerExt() {
}

function useItemDragExt() {
}

function useReorderExt() {
}

export {
    useTreeRendererExt,
    useCompactModeExt,
    useButtonsExt,
    useItemFocusExt,
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
    useItemDragExt,
    useReorderExt,
    useItemManagerExt,
    useCustomizationExt,
    useHotkeysExt,
    useModelSnapshotExt,
    useUiBlockingExt,
    usePaginationExt,
    useInfiniteScrollingExt
}