import { useState, useRef } from "react"
import { Icon, Div } from "components/layout"
import { d, ClassNames } from "core/helper"
import { Filterbox, getCols } from "components/common"
import { ButtonGroup, FormGrid, InputCells } from "components/form"
import {
    arrowMove,
    useItemContainer,
    useFocusOnItemContainer,
    usePickerOnItemContainer,
    useFocusGroupsOnItemContainer,
    useUpdateOnEntityIndexChanges
} from "components/common"
import { useModalWindow } from "components/modal"
import { OkCancelLayout, Centered } from "components/layout"
import { ButtonsAndDivGroup, CustomCells } from "components/form"
import { FocusRowCtx, useSelectionOnItemContainer, useGetNewAttrWithDimProps } from "components/common"
import { isFunction, isString, without } from "core/helper"
import { FILTER, ROOT_FOLDER_ID } from "core/entity-tree"

function LevelSpacer({ level }) {
    const px = (level - 1) * 15
    return <Div width={px + "px"} />
}

function FolderSelector({ folder, close, match, skipFolder, treeIndex, save }) {
    const [selection, setSelection] = useState(() => {
        if (folder === undefined) return []
        return ["folder " + folder]
    })

    return (
        <OkCancelLayout
            cancel={close}
            ok={() => {
                if (selection.length === 0) {
                    save("0")
                    return
                }
                const [, value] = selection[0].split(" ", 2)
                save(value)
            }}
        >
            <TreeIndexStack
                treeIndex={treeIndex}
                selection={selection}
                setSelection={setSelection}
                skipFolder={skipFolder}
                match={match}
                folderSelect
            />
        </OkCancelLayout>
    )
}

function FolderInput({ folder, treeIndex, setFolder, skipFolder, match }) {
    const FolderSelectorModal = useModalWindow()
    const folderIndex = treeIndex.folderIndex
    const openSelector = () => {
        FolderSelectorModal.open({
            treeIndex,
            folder,
            match,
            skipFolder,
            save: (index) => {
                setFolder(index)
                FolderSelectorModal.close()
            }
        })
    }
    let currPath = folderIndex.getFolderPathNames(folder).join("/")
    if (currPath !== "") {
        currPath += "/"
    }
    currPath = "/" + currPath

    const buttons = [
        {icon: "edit", onPressed: openSelector},
        {icon: "delete", onPressed: () => setFolder(ROOT_FOLDER_ID)}
    ]
    return (
        <>
            <div className="stack-h gap-x-d2x items-start">
                <Div
                    className="text-input-text bg-input-bg border-input-border border px-d2x py-d2y"
                    width="200px"
                >
                    <div className="stack-v overflow-hidden">
                        <div className="text-xs opacity-50 truncate">
                            {currPath}
                        </div>
                        <div className="text-sm">
                            {folderIndex.getFolderName(folder) ?? " "}
                        </div>
                    </div>
                </Div>
                <ButtonGroup buttons={buttons} />
            </div>

            <FolderSelectorModal.content>
                <FolderSelector {...FolderSelectorModal.props} />
            </FolderSelectorModal.content>
        </>
    )
}

function FolderForm({ model, save, close, treeIndex, match }) {
    const [name, setName] = useState(model.name)
    const [parent, setParent] = useState(model.parent ?? "0")

    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() => save({ ...model, name, parent })}
        >
            <FormGrid>
                <CustomCells name="Parent:">
                    <FolderInput
                        folder={parent}
                        skipFolder={model.value}
                        setFolder={setParent}
                        treeIndex={treeIndex}
                        match={match}
                    />
                </CustomCells>
                <InputCells
                    name="Name:"
                    required
                    value={name}
                    set={setName}
                    autoFocus={true}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function FileForm({ model, save, close, treeIndex, match }) {
    const [name, setName] = useState(model.name)
    const [folder, setFolder] = useState(model.folder ?? "0")

    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() => save({ ...model, name, folder })}
        >
            <FormGrid>
                <CustomCells name="Parent:">
                    <FolderInput
                        folder={folder}
                        setFolder={setFolder}
                        treeIndex={treeIndex}
                        match={match}
                    />
                </CustomCells>
                <InputCells
                    name="Name:"
                    required
                    value={name}
                    set={setName}
                    autoFocus={true}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function NumberChip({ value, maxValue, icon, color = true, className = "" }) {
    const cls = ClassNames("stack-h px-d2x gap-x-d1x items-center rounded-full text-xs", className)
    cls.addIf(color, "bg-active-bg text-active-text")
    const elem = maxValue !== undefined ? <MaxNumber value={value} maxValue={maxValue} /> : <div>{value}</div>
    return <div className={cls.value}>{icon && <Icon name="add_circle" />}{elem}</div>
}

const defaultIconRender = ({ nodeType, closed, index }, alwaysExpanded = false, treeIndex) => {
    if (nodeType === 'leaf') {
        return ''
    }
    return (
        <div
            className="pr-d2x"
            onClick={
                alwaysExpanded ?
                    undefined :
                    (e) => {treeIndex.toggleFolder(index); e.stopPropagation()}
            }><Icon
            name={
                nodeType === "leaf"
                    ? "arrow_right"
                    : "folder" + (closed && !alwaysExpanded ? "" : "_open")
            }
            className={nodeType === "leaf" ? "opacity-50" : ""}
        /></div>
    )
}

function getSpacingCls(value) {
    if (!value) return ''
    switch(value) {
        case 1: return '[&:not(:first-child)]:mt-[1px]'
        case 2: return '[&:not(:first-child)]:mt-[2px]'
        case 3: return '[&:not(:first-child)]:mt-[3px]'
        case 4: return '[&:not(:first-child)]:mt-[4px]'
        case 5: return '[&:not(:first-child)]:mt-[5px]'
    }
    throw Error(`Unsupported value "${value}" for spacing`)
}

function ContainerNodeListInner({
   treeView,
   containerRef,
   treeIndex,
   className,
   itemClassName,
    innerClassName,
   render = item => item.name,
   full,
   selectable,
   selection,
   setSelection,
   maxSelection,
   itemAction,
   itemActions,
    itemSpacing = 2,
   compact,
   filter,
   alwaysExpanded,
   reverse,
   treeSelection,
    iconRender = defaultIconRender,
    cols = 'header/25',
    colsItems = 'input',
    colsInner = colsItems,
    wrap = true,
   bordered = true,
   padded = true,
   sized = true,
   colored = true,
   styled = true,
   emptyMsg = "No items available",
}) {
    const { nodes, treeOrder, markedOutside } = treeView
    const folderIndex = treeIndex.folderIndex
    const cls = new ClassNames("stack-v item-start", className)
    const innerCls = new ClassNames("full", innerClassName)
    innerCls.addIf(styled && padded, 'px-d2x py-d2y')

    const outerCls = new ClassNames(" auto full overflow-y-auto")
    let colItemsCls = ''
    if (styled && colored) {
        const colComp = getCols(cols)
        const colCompCls = `${colComp.bg} ${colComp.color}`

        if (colsInner === cols) {
            outerCls.add(colCompCls)
        } else {
            cls.add(colCompCls)
            const colInner = getCols(colsInner)
            innerCls.add(colInner.bg)
            innerCls.add(colInner.color)
        }
        const colItems = getCols(colsItems)
        colItemsCls = `${colItems.bg} ${colItems.color}`
    }
    outerCls.addIf(styled && bordered, "border")
    outerCls.addIf(styled && bordered && colored, "border-input-border")

    const container = useItemContainer({
        view: true,
        treeOrder,
        items: nodes,
        item2value: (x) => {
            return `${x.nodeType} ${x.value}`
        },
        value2item: (x) => {
            const [ type, value ] = x.split(" ", 2)
            const indexName = type === "folder" ? "folderIndex" : "leafIndex"

            return treeIndex[indexName].getEntityByPropValue('value', value)
        }
    })
    if (containerRef) containerRef.current = container
    if (itemActions) {
        useFocusGroupsOnItemContainer({ container })
    } else {
        const moveFocus = (container, x, y, shift) => {
            const { nodeType, index, closed } = nodes[container.getIndex(container.tabIndex)]
            if (!alwaysExpanded && nodeType === "folder") {
                if ((closed && x > 0) || (!closed && x < 0)) {
                    treeIndex.toggleFolder(index)
                    return container.tabIndex
                }
            }
            return arrowMove.prevNext(container, x, y, shift)
        }
        useFocusOnItemContainer({ container, moveFocus })
    }
    if (selection) {
        if (!itemAction) {
            itemAction = (node, index) => {
                const [nodeType] = node.split(" ", 2)
                if (nodeType !== "folder" || !selectable || (selectable && selectable(node))) {
                    container.toggle(index)
                } else if (!maxSelection) {
                    container.toggleSubtree(index)
                } else if (nodeType === "folder" && !alwaysExpanded) {
                    treeIndex.toggleFolder(nodes[index].index)
                }
            }
        }
        useSelectionOnItemContainer({
            container,
            max: maxSelection,
            events: false, // itemActions === undefined,
            selectable,
            selection,
            setSelection,
            treeSelection
        })
    } else if (!itemAction && !alwaysExpanded) {
        itemAction = (typeAndValue) => {
            const [nodeType, value] = typeAndValue.split(" ", 2)
            if (nodeType !== "folder") return

            const index = folderIndex.getEntityByPropValue(
                "value",
                value
            )
            treeIndex.toggleFolder(index)
        }
    }
    if (itemAction) {
        usePickerOnItemContainer({ container, pick: itemAction })
    }
    cls.addIf(full, "full")
    cls.addIf(!wrap, "text-nowrap")

    let getItemActions = () => []
    if (itemActions) {
        getItemActions = (index) => {
            const buttons = []
            for (const { action, ...button } of itemActions) {
                buttons.push({
                    onPressed: () =>
                        action(nodes[index], selection, setSelection),
                    keepFocus: true,
                    ...button
                })
            }
            return buttons
        }
    }

    let elems = []

    const divider = getSpacingCls(itemSpacing)
    for (const [index, node] of nodes.entries()) {
        if (!node.visible) continue

        const item = container.getItem(index)
        const itemCls = new ClassNames("hover:brightness-110", itemClassName)
        const btnCls = new ClassNames('items-start')
        itemCls.addIf(!itemActions, divider)
        itemCls.addIf(
            !itemActions,
            "focus:z-10 focus:outline-none focus:ring focus:ring focus:ring-focus-border focus:border-0"
        )
        itemCls.addIf(styled && sized, "text-sm")
        if (styled && padded) {
            itemCls.add("px-d2x py-d2y")
            btnCls.add("px-d2x py-d2y")
        }
        itemCls.addIf(!wrap, "truncate")
        if (styled && colored) {
            const subMarked = treeSelection && node.markedAncestor
            itemCls.addIf(
                item.marked || subMarked,
                subMarked ? "bg-active-bg/70 text-active-text" : "bg-active-bg text-active-text",
                colItemsCls
            )
        }
        if (itemActions) itemCls.add("auto full")

        const { nodeType, viewLevel, level, closed, pathNames, markedHidden = 0 } = node

        const showPathNames = viewLevel === 1 && level > 1 && !!pathNames
        // TODO wrap-break-word should be injected or dependant on setting
        const nodeElem = (
            <div className="stack-h full py-d1y">
                <Div className="stack-h pl-d2x">
                    <LevelSpacer level={viewLevel} />
                    {iconRender(node, alwaysExpanded, treeIndex)}
                </Div>
                <div className="stack-v auto text-xs pr-d2x">
                    {showPathNames && (
                        <div className="opacity-50">{pathNames.join(" > ")}</div>
                    )}
                    <div
                        className={
                            "auto text-xs wrap-break-word" +
                            (nodeType !== "leaf" && !showPathNames ? " opacity-50" : "")
                        }
                    >
                        {render(node)}
                    </div>
                </div>
                {markedHidden > 0 && <NumberChip value={markedHidden} icon="add_circle" />}
            </div>
        )
        let elem = itemActions ? (
            <ButtonsAndDivGroup
                reverse={reverse} key={filter + index} buttons={getItemActions(index)}
                disabled={selection && selection.length > 0}
                action={() => selection && container.toggle(index)} rowIndex={elems.length} buttonsClassName={btnCls.value} className={'items-stretch ' + colItemsCls + ' ' + (divider ? divider : '') }>
                <Div {...item.attr.props} className={itemCls.value}>
                    {nodeElem}
                </Div>
            </ButtonsAndDivGroup>
        ) : (
            <Div key={filter + index} {...item.attr.props} className={itemCls.value}>
                {nodeElem}
            </Div>
        )
        elems.push(elem)
    }
    const isFiltered = !!filter
    const bgCls = new ClassNames("auto w-full stack-v")
    bgCls.addIf(elems.length, 'shadow-inner shadow-2xl')
    elems.push(
        <div key={-1} className={bgCls.value}>
            {elems.length === 0 && (
                <div className="full text-xs px-d2x py-d2y auto">
                    <Centered>{isFiltered ? `No matches for "${filter}"` : emptyMsg}</Centered>
                </div>
            )}
            {markedOutside > 0 && <div className="stack-h w-full px-d2x py-d2y gap-x-d2x text-xs">
                <div className="text-right auto">Hidden:</div>
                <NumberChip value={markedOutside} icon="add_circle" />
            </div>}
        </div>
    )
    if (compact && !nodes.length) return

    return (
        <div className={outerCls.value} tabIndex={-1}>
            <div className={innerCls.value}>
                <Div
                    className={cls.value}
                    {...container.attr.props}
                >
                    {elems}
                </Div>
            </div>
        </div>
    )
}

function ContainerNodeList({ itemActions, ...props }) {
    if (itemActions) {
        return (
            <FocusRowCtx>
                <ContainerNodeListInner {...props} itemActions={itemActions} />
            </FocusRowCtx>
        )
    }
    return <ContainerNodeListInner {...props} />
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

const CONTROL = {
    CASE_SENSITIVE: 1,
    OR: 2,
    MODE: 4
}

function TreeIndexStack({ treeIndex, controls = 0, colsBar, alwaysExpanded, filterOptions = {}, compact, match, skip, isFilterVisible, header = "buttons", footer, className, buttons = [], ...props }) {
    const containerRef = useRef(null)
    const [filterRaw, setFilter] = useState("")
    const [caseSensitive, setCaseSensitive] = useState(filterOptions.caseSensitive ?? FILTER.DEFAULTS.caseSensitive)
    const [or, setOr] = useState(filterOptions.or ?? FILTER.DEFAULTS.or)
    const [mode, setMode] = useState(filterOptions.mode ?? FILTER.DEFAULTS.mode)

    // TODO: check this...
    const { styled = true, boxed, color = true, padded = true } = props
    if (!colsBar) colsBar = boxed ? 'header/50' : 'header/0'

    useUpdateOnEntityIndexChanges(treeIndex)

    const treeView = treeIndex.getNodes({
        alwaysExpanded,
        selection: props.selection,
        filter: filterRaw,
        filterOptions: {
            ...filterOptions,
            mode,
            caseSensitive,
            or,
        },
        match: props.match,
        skip,
    })
    const getContainer = () => {
        if (!containerRef.current) throw Error(`Container referenced before initialization`)

        return containerRef.current
    }

    const getBarGroups = (value) => {
        if (!value) return []

        if (isString(value)) value = value.split(" ")

        const elems = []
        let maxElem = value.length
        for (const [index, group] of value.entries()) {
            if (isFunction(group)) {
                elems.push(group({getContainer, index}))
                continue
            }
            if (index > 0 && index < maxElem && group !== 'auto') {
                const sepCls = true ?
                    "w-[2px] h-6 bg-header-bg/75" :
                    "stack-h px-d1x divide-x divide-input-border divide-opacity-40";
                elems.push(<div key={"g" + index} className="px-d2x"><div key={'d' + index}
                                className={sepCls}
                ></div></div>)
            }
            let elem
            switch (group) {
                case "filter":
                    elem = <Filterbox
                        key={index}
                        filter={filterRaw}
                        setFilter={setFilter}
                        toggleSortDir={() => treeIndex.toggleSortDir()}
                        caseSensitive={caseSensitive}
                        setCaseSensitive={controls & CONTROL.CASE_SENSITIVE ? setCaseSensitive : undefined}
                        or={or}
                        setOr={controls & CONTROL.OR ? setOr : undefined}
                        mode={mode}
                        setMode={controls & CONTROL.MODE ? setMode : undefined}
                    />
                    break

                case "buttons":
                    if (buttons.length) {
                        elem = <ButtonGroup key={index} buttons={buttons} />
                    }
                    break

                case "expand":
                    if (!alwaysExpanded) {

                        elem = <ButtonGroup key={index} buttons={
                            [
                                {icon: "expand_more", onPressed: () => treeIndex.expandAll(match)},
                                {icon: "expand_less", onPressed: () => treeIndex.collapseAll(match)}
                            ]
                        } />
                    }
                    break

                case "marking":
                    if (!props.selection) break

                    const markedCls = new ClassNames("auto text-xs")
                    markedCls.addIf(props.selection.length, "rounded-full bg-active-bg text-active-text px-d2x", "px-d2x")
                    const markButtons = [{icon: 'done_all', onPressed: () => getContainer().selectAll()}]
                    if (!props.treeSelection) {
                        markButtons.push({icon: 'star_half', onPressed: () => getContainer().selectInverse()})
                    }
                    markButtons.push({icon: 'visibility', disabled: treeView.markedOutside === 0, onPressed: () => {
                        const inView = []
                        for (const node of treeView.nodes) {
                            const id = node.nodeType + ' ' + node.value
                            if (!node.inView || !props.selection.includes(id)) continue
                            inView.push(id)
                        }
                        props.setSelection(inView)
                    }})
                    markButtons.push({icon: 'clear', disabled: props.selection.length === 0, onPressed: () => props.setSelection([])})
                    elem = <div key={index} className="stack-h gap-x-d2x items-center">
                        <div className="stack-h gap-x-d1x text-xs">
                            <div className="">Marked:</div>
                            <NumberChip value={props.selection.length} maxValue={treeView.nodes.length} xclassName={markedCls.value} color={props.selection.length} />
                        </div>
                        <ButtonGroup buttons={markButtons} />
                    </div>
                    break

                case "auto":
                    maxElem--
                    elem = <div key={index} className="auto" />
                    break
            }
            if (elem) elems.push(elem)
        }
        return elems
    }

    const isCompact = compact && !treeView.nodes.length
    const headerElems = getBarGroups(isCompact ? "buttons" : header)
    const footerElems = getBarGroups(footer)

    const cls = ClassNames("stack-v px-d2x py-d2y", className)
    cls.addIf(!boxed, "gap-y-d1y")

    const wrapStackCss = "stack-h flex-wrap items-center gap-x-d2x gap-y-d2y py-d1y"
    const headerCls = ClassNames(wrapStackCss)
    const footerCls = ClassNames(wrapStackCss)

    if (styled && color) {
        const cols = getCols(colsBar)
        headerCls.add(cols.bg)
        footerCls.add(cols.bg)
        headerCls.add(cols.color)
        footerCls.add(cols.color)
    }

    headerCls.addIf(boxed, "px-d1x border-input-border")
    headerCls.addIf(styled && isCompact, "border", boxed ? "border-x border-t" : "")
    footerCls.addIf(styled && boxed, "border-x border-b px-d2x border-input-border")

    const attr = useGetNewAttrWithDimProps(props)
    if (treeView.nodes.length === 0 && !(cls.has('h-full') || cls.has('full'))) {
        // v-centering for empty message
        cls.addIf(!attr.hasStyle('height') && attr.hasStyle('minHeight'), 'full')
    }
    return (
        <div className={cls.value} {...attr.props}>
            {headerElems.length > 0 && <div className={headerCls.value}>
                {headerElems}
                </div>
            }

            {!isCompact && <ContainerNodeList full containerRef={containerRef} treeView={treeView} treeIndex={treeIndex}
                  alwaysExpanded={alwaysExpanded} filter={filterRaw} {...props}
            />}

            {footerElems.length > 0 && !isCompact && <div className={footerCls.value}>
                {footerElems}
            </div>
            }
        </div>
    )
}

export { FolderInput, FileForm, FolderForm, TreeIndexStack, CONTROL }
