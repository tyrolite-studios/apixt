import { useState, useRef, useMemo } from "react"
import { MappingIndex, TreeIndex } from "core/entity"
import { Icon, Div } from "components/layout"
import { d, ClassNames } from "core/helper"
import { Filterbox } from "components/common"
import {
    ButtonGroup,
    FormGrid,
    InputCells,
    SelectCells,
    Button
} from "components/form"
import {
    useComponentUpdate,
    useFocusManager,
    useUpdateOnEntityIndexChanges
} from "components/common"
import { useModalWindow } from "components/modal"
import { OkCancelLayout } from "components/layout"
import { CustomCells } from "../components/form"

class FolderIndex extends MappingIndex {
    constructor(model) {
        super(model, ["name", "parent", "closed", "path"])
        this.value2path = {}
    }

    getEntityPropValue(index, prop) {
        if (prop === "path") {
            let value = this.items[index]
            let path = this.value2path[value]

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

function FolderSelector({ close, folderIndex, save }) {
    const [active, setActiveRaw] = useState(0)
    const setActive = (value) => setActiveRaw(value === active ? -1 : value)
    return (
        <OkCancelLayout
            cancel={close}
            ok={() => {
                save(
                    active === -1
                        ? "0"
                        : folderIndex.getEntityPropValue("value", active)
                )
            }}
        >
            <StorageTree
                folderIndex={folderIndex}
                active={active}
                setActive={setActive}
                folderSelect
            />
        </OkCancelLayout>
    )
}

function FolderForm({ model, save, close, folderIndex, match }) {
    const FolderSelectorModal = useModalWindow()
    const [name, setName] = useState(model.name)
    const [parent, setParent] = useState(model.parent ?? "0")

    /*
    const folderOptions = useMemo(() => {
        const indices = folderIndex.getView({ match }).matches

        const options = [
            { id: "0", name: "" },
            ...folderIndex.getEntityObjects(indices).map((item) => {
                const { name, value, path } = item
                let level = path.length

                let pad = ""
                if (level > 0) {
                    level--
                }
                while (level > 0) {
                    pad += "\u00A0\u00A0\u00A0\u00A0"
                    level--
                }
                return { id: value, name: pad + name }
            })
        ]
        return d(options)
    }, [])
    */

    const openSelector = () => {
        FolderSelectorModal.open({
            folderIndex,
            match,
            save: (index) => {
                d(index)
                FolderSelectorModal.close()
            }
        })
    }

    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() => save({ ...model, name, parent })}
        >
            <>
                <FormGrid>
                    <InputCells
                        name="Name:"
                        required
                        value={name}
                        set={setName}
                        autoFocus={true}
                    />
                    <CustomCells name="Parent:">
                        <Button icon="edit" onPressed={openSelector} />
                    </CustomCells>
                </FormGrid>

                <FolderSelectorModal.content>
                    <FolderSelector {...FolderSelectorModal.props} />
                </FolderSelectorModal.content>
            </>
        </OkCancelLayout>
    )
}

function StorageTree({
    styled = true,
    sized = true,
    padded = true,
    wrap = true,
    colored = true,
    folderSelect = false,
    match,
    ...props
}) {
    const FolderFormModal = useModalWindow()

    const [filter, setFilter] = useState("")
    const stackRef = useRef(null)
    useUpdateOnEntityIndexChanges(requestStorage)
    const update = useComponentUpdate()

    const nodes = requestStorage.getNodes({
        filter,
        match: folderSelect
            ? (type, ...params) => {
                  if (type !== "folder") return false
                  return !match || match(type, ...params)
              }
            : match
    })
    const pick = ({ index, nodeType }) => {
        if (nodeType === "folder") {
            if (folderSelect) {
                if (props.pick) {
                    props.pick(
                        folderIndex.getEntityPropValue(index, "value") ?? "0"
                    )
                }
            } else {
                requestStorage.toggleFolder(index)
            }
        }
    }

    let currActive = -1
    if (props.active !== undefined) {
        currActive = props.active
    }

    const { focusItem, hasFocus, attr, tabIndex, ...focus } = useFocusManager({
        setActive:
            props.setActive !== undefined
                ? (index) => {
                      props.setActive(index)
                  }
                : (index) => {
                      pick(d(nodes[index], "PICK"))
                  },
        update,
        active: d(props.active ?? -1),
        deselect: true,
        divRef: stackRef,
        count: nodes.length,
        handleSpace: true
    })

    const render = (item) => item.name
    const elems = []
    let i = 0
    for (const item of nodes) {
        const isFocused = hasFocus && i === tabIndex

        const itemCls = new ClassNames(
            "focus:outline-none focus:ring focus:ring-inset focus:ring-focus-border focus:border-0 hover:brightness-110"
        )
        itemCls.addIf(styled && sized, "text-xs")
        itemCls.addIf(!wrap, "truncate")
        itemCls.addIf(
            styled && colored,
            props.setActive && i === props.active
                ? "bg-active-bg text-active-text"
                : "bg-input-bg text-input-text"
        )

        const itemAttr = focus.itemAttr(i)
        itemAttr.style = {
            cursor: "pointer"
        }
        if (isFocused) {
            itemAttr.style.zIndex = 40
        }

        const { nodeType, level, closed, path } = item
        let elem = (
            <Div
                key={nodeType + " " + item.index}
                className={itemCls.value}
                {...itemAttr}
            >
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
                            {render(item)}
                        </div>
                    </div>
                </div>
            </Div>
        )
        elems.push(elem)
        i++
    }

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
    const cls = ClassNames(
        "stack-v w-full border border-input-border bg-input-bg text-input-text auto"
    )
    const itemsDiv = (
        <Div ref={stackRef} className={cls.value} {...attr}>
            {elems}
        </Div>
    )

    return (
        <>
            <div className="stack-v p-2 h-full">
                {!folderSelect && (
                    <div className="stack-h gap-2 py-1 w-full">
                        <ButtonGroup buttons={buttons} />
                        <div className="auto" />
                        <Filterbox
                            filter={filter}
                            setFilter={setFilter}
                            toggleSortDir={() => requestStorage.toggleSortDir()}
                        />
                    </div>
                )}
                {itemsDiv}
            </div>

            <FolderFormModal.content>
                <FolderForm {...FolderFormModal.props} />
            </FolderFormModal.content>
        </>
    )
}

export { FolderIndex, StorageTree }
