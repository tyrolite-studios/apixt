import { useContext, useState } from "react"
import { MappingIndex } from "core/entity"
import { EntityStack, EntityList } from "components/common"
import { without, d } from "core/helper"
import { useModalWindow } from "components/modal"
import { extractLcProps } from "core/entity"
import { OkCancelLayout } from "components/layout"
import { FormGrid, InputCells } from "components/form"
import { FolderInput } from "entities/folders"
import { AppContext } from "components/context"
import { CustomCells } from "components/form"
import { FolderIndex, FileForm, FolderForm, TreeIndexStack } from "entities/folders"
import { useConfirmation } from "../components/common.js"

class RequestIndex extends MappingIndex {
    constructor(model) {
        super(model, ["name", "folder", "request", "assignments"])
        this.filterProps = ["name"]
    }
}

class RequestFolderIndex extends FolderIndex {
    constructor(model) {
        super(model, ['api'])
    }
}

function SaveRequestForm({ close, api, match, model, save, reserved }) {
    const aContext = useContext(AppContext)
    const [name, setName] = useState(model.name)
    const [folder, setFolder] = useState(model.folder)
    return (
        <OkCancelLayout submit ok={() => save({ name, folder })} cancel={close}>
            <FormGrid>
                <CustomCells>
                    <FolderInput api={api} match={match} treeIndex={aContext.requestTreeIndex} folder={folder} setFolder={setFolder} />
                </CustomCells>
                <InputCells
                    name="Name"
                    required
                    autoFocus
                    isValid={(name) => !reserved.includes(name.toLowerCase())}
                    value={name}
                    set={setName}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function RequestPicker({ requestIndex, pick }) {
    const [selected, setSelected] = useState([])
    return (
        <EntityList
            entityIndex={requestIndex}
            pick={(x) => d("PICK", x)}
            selected={selected}
            setSelected={() => {}}
            render={({ name, request }) => (
                <div>
                    <div className="size-sm">{name}</div>
                    <div className="size-xs opacity-50">
                        {request.method} {request.path}
                    </div>
                </div>
            )}
        />
    )
}

function RequestStack({ requestIndex, load }) {
    const RequestFormModal = useModalWindow()

    const actions = [
        {
            action: "delete",
            op: {
                exec: (selected, setSelected) => {
                    requestIndex.deleteEntities(selected)
                    setSelected([])
                },
                can: (selected) => selected.length > 0
            }
        }
    ]
    const itemActions = [
        {
            icon: "east",
            action: (index) => {
                const model = requestIndex.getEntityObject(index)
                load(model)
            }
        },
        {
            icon: "edit",
            action: (index) => {
                const model = requestIndex.getEntityObject(index)
                RequestFormModal.open({
                    edit: true,
                    reserved: extractLcProps(requestIndex, "name", model),
                    model,
                    save: (newModel) => {
                        requestIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        RequestFormModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => requestIndex.deleteEntity(index)
        }
    ]

    return (
        <>
            <EntityStack
                entityIndex={requestIndex}
                actions={actions}
                itemActions={itemActions}
                render={({ name, request }) => (
                    <div className="stack-v">
                        <div>{name}</div>
                        <div className="opacity-50 text-xs">
                            {request.method} {request.path}
                        </div>
                    </div>
                )}
            />

            <RequestFormModal.content>
                <SaveRequestForm {...RequestFormModal.props} />
            </RequestFormModal.content>
        </>
    )
}

function RequestTreeManager({ treeIndex, api, match, close, ...props }) {
    const confirmation = useConfirmation()
    const FolderFormModal = useModalWindow()
    const FileFormModal = useModalWindow()
    const folderIndex = treeIndex.folderIndex
    const fileIndex = treeIndex.leafIndex
    const [selection, setSelection] = useState([])
    const buttons = [
        {
            icon: "add",
            onPressed: () => {
                const model = {
                    value: crypto.randomUUID(),
                    closed: false,
                    api,
                    name: "",
                    parent: "0"
                }
                FolderFormModal.open({
                    model,
                    save: (newModel) => {
                        folderIndex.setEntityObject({ ...model, ...newModel })
                        FolderFormModal.close()
                    },
                    treeIndex,
                    match
                })
            }
        },
        {
            icon: "delete",
            disabled: selection.length === 0,
            onPressed: () => {
                const files = []
                const folders = []
                for (const node of selection) {
                    const [ nodeType, value ] = node.split(" ", 2)
                    if (nodeType === 'leaf') {
                        files.push(value)
                    } else {
                        folders.push(value)
                    }
                }
                const delFileIds = []
                for (const value of files) {
                    const index = fileIndex.getEntityByPropValue('value', value)
                    if (index === null) continue

                    delFileIds.push(index)
                }
                const found = { files: delFileIds, folders: [] }
                for (const value of folders) {
                    const index = folderIndex.getEntityByPropValue('value', value)
                    treeIndex.getFolderTreeNodes(index, match, found)
                }
                confirmation.open({
                    msg: "Do you really want to delete?",
                    confirmed: () => {
                        fileIndex.deleteEntities(found.files)
                        folderIndex.deleteEntities(found.folders)
                    }
                })
            }
        }
    ]
    const itemActions = [
        {
            icon: "edit",
            action: ({ nodeType, index }) => {
                if (nodeType === "folder") {
                    const model = folderIndex.getEntityObject(index)
                    FolderFormModal.open({
                        edit: true,
                        model,
                        treeIndex,
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
                    return
                }
                const model = fileIndex.getEntityObject(index)
                FileFormModal.open({
                    edit: true,
                    model,
                    treeIndex,
                    save: (newModel) => {
                        fileIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        FileFormModal.close()
                    },
                    folderIndex,
                    match
                })
            }
        },
        {
            icon: "check",
            action: (node) => {
                const nodeValue = `${node.nodeType} ${node.value}`
                if (selection.includes(nodeValue)) {
                    setSelection(without(selection, nodeValue))
                } else {
                    setSelection([ ...selection, nodeValue ])
                }
            }
        },
        {
            icon: "delete", action: ({ nodeType, index }) => {
                let delFiles = []
                let delFolders = []
                if (nodeType === 'folder') {
                    const { folders, files } = treeIndex.getFolderTreeNodes(index, match)
                    delFiles = files
                    delFolders = folders
                } else {
                    delFiles = [index]
                }
                if (!delFiles.length && !delFolders.length) return

                confirmation.open({
                    msg: "Do you really want to delete?",
                    confirmed: () => {
                        fileIndex.deleteEntities(delFiles)
                        folderIndex.deleteEntities(delFolders)
                    }
                })
            }
        }
    ]
    return <>
        <OkCancelLayout cancel={() => close()} ok={() => close()}>
            <TreeIndexStack
                treeIndex={treeIndex}
                buttons={buttons}
                selection={selection}
                setSelection={setSelection}
                itemActions={itemActions}
                match={match}
                {...props}
            />
        </OkCancelLayout>

        {confirmation.Modals}

        <FolderFormModal.content>
            <FolderForm {...FolderFormModal.props} />
        </FolderFormModal.content>

        <FileFormModal.content>
            <FileForm {...FileFormModal.props} />
        </FileFormModal.content>
    </>
}

function RequestTree({ api, pick, match, filter, ...props }) {
    const aContext = useContext(AppContext)

    const treeIndex = aContext.requestTreeIndex
    const ManagerModal = useModalWindow()
    const buttons = [
        {
            icon: "build",
            onPressed: () => ManagerModal.open()
        }
    ]
    const render = node => {
        return <div className="stack-v">
            <div className="text-xs">{node.name}</div>
            {node.nodeType !== 'folder' && <div className="opacity-50">
                {node.request.method}{" "}
                {node.request.path}
            </div>}
        </div>
    }
    return (
        <>
            <TreeIndexStack
                className="h-full"
                treeIndex={treeIndex}
                match={match}
                buttons={buttons}
                pick={pick}
                render={render}
                filter
                {...props}
            />

            <ManagerModal.content>
                <RequestTreeManager treeIndex={treeIndex} api={api} match={match} filter={filter} {...props} {...ManagerModal.props} />
            </ManagerModal.content>
        </>
    )
}

export { RequestIndex, RequestFolderIndex, RequestStack, RequestPicker, RequestTree, SaveRequestForm }
