import { useState, useRef } from "react"
import { MappingIndex } from "core/entity"
import { Icon, Div } from "components/layout"
import { d, ClassNames } from "core/helper"
import { Filterbox } from "components/common"
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
import { FocusRowCtx, useSelectionOnItemContainer } from "components/common"
import { useGetNewAttrWithDimProps } from "components/common.js"
import { isFunction, isString, without } from "core/helper.js"


const ROOT_FOLDER_ID = "0"

class FolderIndex extends MappingIndex {
    constructor(model, props = [] ) {
        super(model, ["name", "parent", "closed", "path", ...props])
        this.value2path = {}
    }

    getEntityPropValue(index, prop) {
        if (prop === "path") {
            let value = this.items[index]
            const cached = this.value2path[value]
            if (cached !== undefined) return cached

            const path = []
            let curr = index
            do {
                const parent = this.getEntityPropValue(curr, "parent")
                path.unshift(parent)
                curr = this.getEntityByPropValue("value", parent)
            } while (curr)
            this.value2path[value] = path

            return path
        }
        return super.getEntityPropValue(index, prop)
    }

    setEntityPropValue(index, prop, value) {
        if (prop === "path") return

        if (prop === "parent") {
            this.value2path = {}
        }
        return super.setEntityPropValue(index, prop, value)
    }

    getAutoProps() {
        return ["path"]
    }

    doUpdates(...args) {
        super.doUpdates(...args)
        this.value2path = {}
    }

    getFolderName(value) {
        if (value === ROOT_FOLDER_ID) return ""

        const index = this.getEntityByPropValue("value", value)
        if (index === null) return ""

        return this.getEntityPropValue(index, "name")
    }

    getFolderPathNames(value) {
        const path = []
        let currIndex = this.getEntityByPropValue("value", value)
        while (currIndex !== null) {
            const parent = this.getEntityPropValue(currIndex, "parent")
            if (!parent || parent === ROOT_FOLDER_ID) break

            currIndex = this.getEntityByPropValue("value", parent)
            if (currIndex === null) break

            path.unshift(this.getEntityPropValue(currIndex, "name"))
        }
        return path
    }
}

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
            <div className="stack-h gap-2 items-start">
                <Div
                    className="text-input-text bg-input-bg border-input-border border p-2"
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

function ContainerNodeListInner({
        nodes,
    containerRef,
   treeIndex,
   className,
   itemClassName,
   render = (item) => item.name,
   entityIndex,
   full,
   selectable,
   selection,
   setSelection,
   maxSelection,
   itemAction,
   itemActions,
   compact,
   match,
   filter,
    alwaysExpanded,
    reverse,
    treeSelection,
    skip,
   wrap = true,
   bordered = true,
   divided = false,
   padded = true,
   sized = true,
   colored = true,
   styled = true,
   emptyMsg = "No items available",
   ...props
}) {
    const folderIndex = treeIndex.folderIndex
    const cls = new ClassNames("stack-v item-start", className)
    cls.addIf(styled && padded, "p-1")
    cls.addIf(styled && divided, "divide-y")
    cls.addIf(styled && divided && colored, "divide-transparent")
    const outerCls = new ClassNames("overflow-y-auto")
    outerCls.addIf(styled && colored, "bg-input-bg text-input-text auto full")
    outerCls.addIf(styled && bordered, "border")
    outerCls.addIf(styled && bordered && colored, "border-input-border")

    const container = useItemContainer({
        view: true,
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
                    let entityNodes = []

                    const level = nodes[index].level
                    for (let i = index + 1; i < nodes.length; i++) {
                        const currNode = nodes[i]
                        if (currNode.level <= level) break

                        const id = currNode.nodeType + ' ' + currNode.value
                        if (selectable && !selectable(id)) continue

                        entityNodes.push(id)
                    }
                    if (!entityNodes.length) return

                    d('HELLO?', entityNodes)

                    entityNodes = container.getMinSelectables(entityNodes)
                    let remaining = without(selection, entityNodes)
                    if (treeSelection) {
                        let parents = []
                        let parent = nodes[index].folder
                        let i = index
                        while (i >= 0) {
                            const item = nodes[i]
                            i--
                            if (item.value !== parent) continue

                            parents.push("folder " + item.value)
                            parent = item.folder
                        }
                        remaining = without(remaining, parents)
                    }
                    let newSelection =
                        without(entityNodes, selection).length === 0 ?
                            [ ...remaining ] : [ ...remaining, ...entityNodes ]
                    setSelection(newSelection)
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
                    ...button
                })
            }
            return buttons
        }
    }

    const elems = []
    let markedLevel = null
    for (const [index, node] of nodes.entries()) {
        if (!node.visible) continue

        const item = container.getItem(index)
        const itemCls = new ClassNames("hover:brightness-110", itemClassName)
        itemCls.addIf(
            !itemActions,
            "focus:outline-none focus:ring focus:ring-inset focus:ring-focus-border focus:border-0"
        )
        itemCls.addIf(styled && sized, "text-sm")
        itemCls.addIf(styled && padded, "p-1")
        itemCls.addIf(!wrap, "truncate")
        if (styled && colored) {
            if (markedLevel !== null && node.level <= markedLevel) {
                markedLevel = null
            }
            if (item.marked && treeSelection) {
                markedLevel = node.level
            }
            const subMarked = !item.marked && markedLevel !== null
            itemCls.addIf(
                item.marked || subMarked,
                subMarked ? "bg-active-bg/70 text-active-text" : "bg-active-bg text-active-text",
                "bg-input-bg text-input-text"
            )
        }
        if (itemActions) itemCls.add("auto")

        const { nodeType, level, closed, path, hiddenMarked = 0 } = node
        // TODO wrap-break-word should be injected or dependant on setting
        const nodeElem = (
            <div className="stack-h py-1 gap-2">
                <Div className="stack-h pl-2" onClick={alwaysExpanded ? undefined : (e) => {treeIndex.toggleFolder(node.index); e.stopPropagation()}}>
                    <LevelSpacer level={level} />
                    {nodeType !== 'leaf' && <Icon
                        name={
                            nodeType === "leaf"
                                ? "arrow_right"
                                : "folder" +
                                (closed && !alwaysExpanded ? "" : "_open")
                        }
                        className={nodeType === "leaf" ? "opacity-50" : ""}
                    />}
                </Div>
                <div className="stack-v auto text-xs pr-2">
                    {nodeType === "leaf" && path && (
                        <div className="opacity-50">{path}</div>
                    )}
                    <div
                        className={
                            "auto text-xs wrap-break-word" +
                            (nodeType !== "leaf" ? " opacity-50" : "")
                        }
                    >
                        {render(node)}
                    </div>
                </div>
                {hiddenMarked > 0 && <div className="px-2 stack-h gap-1 items-center bg-active-bg text-active-text rounded-full text-xs"><Icon name="add_circle" /><div>{hiddenMarked}</div></div>}
            </div>
        )
        let elem = itemActions ? (
            <ButtonsAndDivGroup reverse={reverse} key={index} buttons={getItemActions(index)}
                                action={() => container.toggle(index)} rowIndex={index} className="items-start">
                <Div {...item.attr.props} className={itemCls.value}>
                    {nodeElem}
                </Div>
            </ButtonsAndDivGroup>
        ) : (
            <Div key={index} {...item.attr.props} className={itemCls.value}>
                {nodeElem}
            </Div>
        )
        elems.push(elem)
    }
    const isFiltered = !!filter
    elems.push(
        <div key={-1} className="auto shadow-inner shadow-2xl bg-black/10 full">
            {nodes.length === 0 && (
                <div className="full opacity-50 text-xs p-2">
                    <Centered>{isFiltered ? `No matches for "${filter}"` : emptyMsg}</Centered>
                </div>
            )}
        </div>
    )
    if (compact && !nodes.length) return

    return (
        <div className={outerCls.value} tabIndex={-1}>
            <Div
                className={cls.value}
                {...container.attr.props}
            >
                {elems}
            </Div>
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

function TreeIndexStack({ treeIndex, alwaysExpanded, compact, boxed, match, skip, header = "buttons", footer, className, buttons = [], ...props }) {
    const containerRef = useRef(null)
    const [filterRaw, setFilter] = useState("")
    useUpdateOnEntityIndexChanges(treeIndex)

    const nodes = treeIndex.getNodes({
        alwaysExpanded,
        selection: props.selection,
        filter: filterRaw,
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
        for (const [index, group] of value.entries()) {
            if (isFunction(group)) {
                elems.push(group({getContainer, index}))
                continue
            }
            if (index > 0 && index < value.length - 1 && group !== 'auto') {
                elems.push(<div key={'d' + index} className="stack-h px-1 divide-x divide-input-border divide-opacity-40"><div /><div /></div>)
            }
            let elem
            switch (group) {
                case "filter":
                    elem = <Filterbox
                        key={index}
                        filter={filterRaw}
                        setFilter={setFilter}
                        toggleSortDir={() => treeIndex.toggleSortDir()}
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
                    markedCls.addIf(props.selection.length, "rounded-full bg-active-bg text-active-text px-2", "px-2")
                    const markButtons = [{icon: 'done_all', onPressed: () => getContainer().selectAll()}]
                    if (!props.treeSelection) {
                        markButtons.push({icon: 'star_half', onPressed: () => getContainer().selectInverse()})
                    }
                    markButtons.push({icon: 'clear', disabled: props.selection.length === 0, onPressed: () => props.setSelection([])})
                    elem = <div key={index} className="stack-h gap-2 items-center">
                        <div className="stack-h gap-1 text-xs">
                            <div className="">Marked:</div>
                            <MaxNumber value={props.selection.length} maxValue={nodes.length} className={markedCls.value} />
                        </div>
                        <ButtonGroup buttons={markButtons} />
                    </div>
                    break

                case "auto":
                    elem = <div key={index} className="auto" />
                    break
            }
            if (elem) elems.push(elem)
        }
        return elems
    }

    const isCompact = compact && !nodes.length
    const headerElems = getBarGroups(isCompact ? "buttons" : header)
    const footerElems = getBarGroups(footer)

    const cls = ClassNames("stack-v p-2", className)
    cls.addIf(!boxed, "gap-1")

    const wrapStackCss = "stack-h flex-wrap gap-2 py-1"
    const headerCls = ClassNames(wrapStackCss)
    headerCls.addIf(boxed, "px-1 border-input-border bg-header-bg/50 text-header-text")
    headerCls.addIf(isCompact, "border", boxed ? "border-x border-t" : "")

    const footerCls = ClassNames(wrapStackCss)
    footerCls.addIf(boxed, "border-x border-b px-2 border-input-border bg-header-bg/50 text-header-text")

    const attr = useGetNewAttrWithDimProps(props)
    if (nodes.length === 0 && !(cls.has('h-full') || cls.has('full'))) {
        // v-centering for empty message
        cls.addIf(!attr.hasStyle('height') && attr.hasStyle('minHeight'), 'full')
    }
    return (
        <div className={cls.value} {...attr.props}>
            {headerElems.length > 0 && <div className={headerCls.value}>
                {headerElems}
                </div>
            }

            {!isCompact && <ContainerNodeList full containerRef={containerRef} nodes={nodes} treeIndex={treeIndex}
                  alwaysExpanded={alwaysExpanded} filter={filterRaw} {...props} />}

            {footerElems.length > 0 && !isCompact && <div className={footerCls.value}>
                {footerElems}
            </div>
            }
        </div>
    )
}

export { FolderIndex, FolderInput, FileForm, FolderForm, TreeIndexStack }
