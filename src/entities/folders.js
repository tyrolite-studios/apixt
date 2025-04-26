import { useState } from "react"
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
import { CustomCells } from "../components/form"
import { FocusRowCtx, useSelectionOnItemContainer } from "../components/common"

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
    container,
   treeIndex,
   className,
   itemClassName,
   render = (item) => item.name,
   entityIndex,
   full,
   skipFolder,
   selection,
   setSelection,
   itemActions,
   compact,
   folderSelect,
   match,
   filter,
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

    const folderIndex = treeIndex.folderIndex
    const cls = new ClassNames("stack-v item-start overflow-y-auto", className)
    cls.addIf(styled && colored, "bg-input-bg text-input-text")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && bordered && colored, "border-input-border")
    cls.addIf(styled && divided, "divide-y")
    cls.addIf(styled && divided && colored, "divide-transparent")

    const nodes = container.items
    if (itemActions) {
        useFocusGroupsOnItemContainer({ container })
    } else {
        const moveFocus = (container, x, y, shift) => {
            const { nodeType, index, closed } = nodes[container.tabIndex]
            if (nodeType === "folder") {
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
        useSelectionOnItemContainer({
            container,
            max: folderSelect ? 1 : undefined,
            events: itemActions === undefined,
            selection,
            setSelection
        })
    } else if (props.pick) {
        const pick = (typeAndValue) => {
            const [nodeType, value] = typeAndValue.split(" ", 2)
            if (nodeType === "folder") {
                if (folderSelect) {
                    if (props.pick) {
                        props.pick(value ?? ROOT_FOLDER_ID)
                    }
                } else {
                    const index = folderIndex.getEntityByPropValue(
                        "value",
                        value
                    )
                    treeIndex.toggleFolder(index)
                }
            } else {
                props.pick(value)
            }
        }
        usePickerOnItemContainer({ container, pick })
    }
    // const divAttr = useGetAttrWithDimProps(props)
    // cls.addIf(!divAttr.style?.width && !full, "max-w-max")
    cls.addIf(full, "w-full")
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
            return <ButtonGroup rowIndex={index} buttons={buttons} />
        }
    }

    const elems = []
    for (const [index, node] of nodes.entries()) {
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
            itemCls.addIf(
                item.marked,
                "bg-active-bg text-active-text",
                "bg-input-bg text-input-text"
            )
        }
        // if (itemActions) args.push(getItemActions(index))
        if (itemActions) itemCls.add("auto")

        const { nodeType, level, closed, path } = node
        // TODO wrap-break-word should be injected or dependant on setting
        const nodeElem = (
            <div className="stack-h py-1 px-2 gap-2">
                <div className="stack-h">
                    <LevelSpacer level={level} />
                    {nodeType !== 'leaf' && <Icon
                        name={
                            nodeType === "leaf"
                                ? "arrow_right"
                                : "folder" +
                                (closed && !folderSelect ? "" : "_open")
                        }
                        className={nodeType === "leaf" ? "opacity-50" : ""}
                    />}
                </div>
                <div className="stack-v auto text-xs">
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
            </div>
        )

        let elem = itemActions ? (
            <Div
                key={index}
                {...item.attr.props}
                className="stack-h w-full items-start"
            >
                <div className="py-1 px-2">{getItemActions(index)}</div>
                <Div {...item.attr.props} className={itemCls.value}>
                    {nodeElem}
                </Div>
            </Div>
        ) : (
            <Div key={index} {...item.attr.props} className={itemCls.value}>
                {nodeElem}
            </Div>
        )
        elems.push(elem)
    }
    const isFiltered = !!filter
    elems.push(
        <div key={-1} className="auto bg-black/10">
            {nodes.length === 0 && (
                <Centered className="opacity-50 text-xs p-2">
                    {isFiltered ? `No matches for "${filter}"` : emptyMsg}
                </Centered>
            )}
        </div>
    )

    if (compact && !elems.length) return

    return (
        <Div
            className={cls.value}
            {...container.attr.props}
        >
            {elems}
        </Div>
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

function TreeIndexStack({ treeIndex, filter, className, buttons = [], ...props }) {
    const [filterRaw, setFilter] = useState("")
    useUpdateOnEntityIndexChanges(treeIndex)
    const nodes = treeIndex.getNodes({
        allOpen: props.itemActions || props.folderSelect,
        skipFolder: props.skipFolder,
        filter: filterRaw,
        match: props.folderSelect
            ? (type, ...params) => {
                if (type !== "folder") return false

                return !props.match || props.match(type, ...params)
            }
            : props.match
    })
    const container = useItemContainer({
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

    const cls = ClassNames("stack-v gap-1 p-2", className)
    return (
        <div className={cls.value}>
            <div className="stack-h gap-2 py-1 w-full">
                {buttons.length > 0 && <ButtonGroup buttons={buttons} />}
                {buttons.length > 0 && <div className="auto" />}
                {filter === true && (
                    <Filterbox
                        filter={filterRaw}
                        setFilter={setFilter}
                        toggleSortDir={() => treeIndex.toggleSortDir()}
                    />
                )}
            </div>

            <ContainerNodeList full container={container} treeIndex={treeIndex} filter={filterRaw} {...props} />

            {props.selection !== undefined && <div className="stack-h gap-2 py-1 w-full">
                <div className="auto text-xs">Marked: {props.selection.length}</div>
                <ButtonGroup buttons={[
                    {icon: 'done_all', onPressed: () => container.selectAll()},
                    {icon: 'star_half', onPressed: () => container.selectInverse()},
                    {icon: 'clear', disabled: props.selection.length === 0, onPressed: () => props.setSelection([])}
                ]}></ButtonGroup>
            </div>}
        </div>
    )
}

export { FolderIndex, FolderInput, FileForm, FolderForm, TreeIndexStack }
