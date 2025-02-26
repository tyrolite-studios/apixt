import { useState, useRef, useMemo } from "react"
import { MappingIndex, TreeIndex } from "core/entity"
import { Icon, Div } from "components/layout"
import { d, clamp, ClassNames } from "core/helper"
import { Filterbox } from "components/common"
import { ButtonGroup, FormGrid, InputCells, Button } from "components/form"
import {
    useGetAttrWithDimProps,
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
    constructor(model) {
        super(model, ["name", "parent", "closed", "path"])
        this.value2path = {}
    }

    getEntityPropValue(index, prop) {
        if (prop === "path") {
            let value = this.items[index]
            let path = this.value2path[value] ?? []

            return path
        }
        return super.getEntityPropValue(index, prop)
    }

    setEntityPropValue(index, prop, value) {
        if (prop === "path") return

        if (prop === "parent") {
            const obj = this.model[this.items[index]]
            if (value !== obj.parent) {
                this.value2path[this.items[index]] = undefined
            }
        }
        return super.setEntityPropValue(index, prop, value)
    }

    getAutoProps() {
        return ["path"]
    }

    assignAutoProps(indices) {
        for (const index of indices) {
            const path = []
            let curr = index
            do {
                const parent = this.getEntityPropValue(curr, "parent")
                path.unshift(parent)
                curr = this.getEntityByPropValue("value", parent)
            } while (curr)
            this.value2path[this.items[index]] = path
        }
        return []
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

const folderIndex = new FolderIndex({})
folderIndex.setEntityObject({
    name: "qewwe",
    value: "0-1",
    parent: "0",
    closed: false
})
folderIndex.setEntityObject({
    name: "nhahsd",
    value: "0-2",
    parent: "0",
    closed: false
})
folderIndex.setEntityObject({
    name: "Zzzz",
    value: "8888",
    parent: "0-2",
    closed: true
})
folderIndex.setEntityObject({
    name: "AAaaaaa",
    value: "2323",
    parent: "0-2",
    closed: true
})

const files = {
    556: {
        name: "Jwewew",
        folders: "0"
    },
    111: {
        name: "Wereerwq",
        folder: "0-1"
    },
    666: {
        name: "Liwejernwr",
        folder: "0-2"
    },
    888: {
        name: "Ywewjewe",
        folder: "0-1"
    }
}

class FileIndex extends MappingIndex {
    constructor(model) {
        super(model, ["name", "folder"])
        this.filterProps = ["name"]
    }
}
const fileIndex = new FileIndex(files)

const requestStorage = new TreeIndex(folderIndex, fileIndex, { sortDir: 1 })
// getNodes({ filter, sortDir })
//   TreeIndex sollte sich die offenen bzw. geschlossenen folder merken

// TreeManager:

// deleteFolder(s)
// createFolder
// moveFolder
// renameFolder
// openFolder
// closeFolder
// openAll
// closeAll

// deleteFile(s)
// moveFile(s)

function LevelSpacer({ level }) {
    const px = (level - 1) * 15
    return <Div width={px + "px"} />
}

function FolderSelector({ folder, close, folderIndex, save }) {
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
            <StorageTree
                folderIndex={folderIndex}
                selection={selection}
                setSelection={setSelection}
                folderSelect
            />
        </OkCancelLayout>
    )
}

function FolderInput({ folder, setFolder, folderIndex, match }) {
    const FolderSelectorModal = useModalWindow()
    const openSelector = () => {
        FolderSelectorModal.open({
            folderIndex,
            folder,
            match,
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
                <Button icon="edit" onPressed={openSelector} />
            </div>
            <FolderSelectorModal.content>
                <FolderSelector {...FolderSelectorModal.props} />
            </FolderSelectorModal.content>
        </>
    )
}

function FolderForm({ model, save, close, folderIndex, match }) {
    const [name, setName] = useState(model.name)
    const [parent, setParent] = useState(model.parent ?? "0")

    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() => save(d({ ...model, name, parent }))}
        >
            <FormGrid>
                <CustomCells name="Parent:">
                    <FolderInput
                        folder={parent}
                        setFolder={setParent}
                        folderIndex={folderIndex}
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

function TreeNodeListInner({
    treeIndex,
    className,
    itemClassName,
    render = (item) => item.name,
    matcher,
    entityIndex,
    full,
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
    useUpdateOnEntityIndexChanges(treeIndex)

    const cls = new ClassNames("stack-v overflow-y-auto", className)
    cls.addIf(styled && colored, "bg-input-bg text-input-text")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && bordered && colored, "border-input-border")
    cls.addIf(styled && divided, "divide-y")
    cls.addIf(styled && divided && colored, "divide-transparent")

    const nodes = treeIndex.getNodes({
        filter,
        match: folderSelect
            ? (type, ...params) => {
                  if (type !== "folder") return false
                  return !match || match(type, ...params)
              }
            : match
    })
    const container = useItemContainer({
        items: nodes,
        item2value: (x) => {
            return `${x.nodeType} ${x.value}`
        },
        value2item: (x) => {
            d("???")
        }
    })
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
        itemCls.add("auto")

        const { nodeType, level, closed, path } = node
        const nodeElem = (
            <div className="stack-h py-1 px-2 gap-2">
                <div className="stack-h">
                    <LevelSpacer level={level} />
                    <Icon
                        name={
                            nodeType === "leaf"
                                ? "arrow_right"
                                : "folder" +
                                  (closed && !folderSelect ? "" : "_open")
                        }
                        className={nodeType === "leaf" ? "opacity-50" : ""}
                    />
                </div>
                <div className="stack-v auto text-xs">
                    {nodeType === "leaf" && path && (
                        <div className="opacity-50">{path}</div>
                    )}
                    <div
                        className={
                            "auto text-xs" +
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

    if (compact && !elems.length) return

    return (
        <Div
            className={cls.value}
            {...container.attr.props}
            //    {...divAttr}
        >
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

function TreeNodeList({ itemActions, ...props }) {
    if (itemActions) {
        return (
            <FocusRowCtx>
                <TreeNodeListInner {...props} itemActions={itemActions} />
            </FocusRowCtx>
        )
    }
    return <TreeNodeListInner {...props} />
}

function TreeNodeListManager({ buttons = [], filter, ...props }) {
    const [filterRaw, setFilter] = useState("")
    return (
        <div className="stack-v gap-1 p-2">
            <div className="stack-h gap-2 py-1 w-full">
                {buttons.length > 0 && <ButtonGroup buttons={buttons} />}
                {buttons.length > 0 && <div className="auto" />}
                {filter === true && (
                    <Filterbox
                        filter={filterRaw}
                        setFilter={setFilter}
                        toggleSortDir={() => requestStorage.toggleSortDir()}
                    />
                )}
            </div>

            <TreeNodeList
                pick={(x) => d(x)}
                filter={filterRaw}
                full
                treeIndex={requestStorage}
                {...props}
            />
        </div>
    )
}

function StorageTree({ match, ...props }) {
    const FolderFormModal = useModalWindow()
    const folderIndex = requestStorage.folderIndex
    const buttons = [
        {
            icon: "build",
            onPressed: () => {
                const model = {
                    value: crypto.randomUUID(),
                    closed: false,
                    name: "",
                    parent: "0"
                }
                FolderFormModal.open({
                    model,
                    save: (newModel) => {
                        folderIndex.setEntityObject({ ...model, ...newModel })
                        FolderFormModal.close()
                    },
                    folderIndex,
                    match
                })
            }
        }
    ]
    const [selection, setSelection] = useState([])
    const itemActions = [
        {
            icon: "edit",
            action: ({ nodeType, ...model }) => {
                if (nodeType === "folder") {
                    FolderFormModal.open({
                        edit: true,
                        model,
                        save: (newModel) => {
                            folderIndex.setEntityObject(
                                { ...model, ...newModel },
                                true
                            )
                            FolderFormModal.close()
                        },
                        folderIndex,
                        match
                    })
                }
            }
        },
        { icon: "delete" }
    ]
    return (
        <>
            <TreeNodeListManager
                treeIndex={requestStorage}
                match={match}
                buttons={buttons}
                selection={selection}
                setSelection={setSelection}
                itemActions={itemActions}
                filter
                {...props}
            />

            <FolderFormModal.content>
                <FolderForm {...FolderFormModal.props} />
            </FolderFormModal.content>
        </>
    )
}

export { FolderIndex, StorageTree, TreeNodeListManager }
