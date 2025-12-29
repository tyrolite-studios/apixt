import { useState, useMemo } from "react"
import { Section, DashedRect } from "./common.js"
import { TreeComponentRenderer } from "../entities/folders"
import { FolderTreeIndex, MappingIndex, NodeWithParentTreeIndex, RecursiveParentTree } from "../core/entity"
import { FILTER } from "../core/filter.js"
import { FolderIndex, TreeIndex } from "../core/entity-tree"
import { cloneDeep, unique } from "../core/helper"
import { useConfirmation } from "../components/common.js"
import {
    useButtonsExt,
    useCompactModeExt,
    useTreeRendererExt,
    useItemCountExt,
    useCustomizationExt,
    useItemFilterExt,
    useItemFocusExt,
    useItemButtonsExt,
    useItemSelectionExt,
    useItemExportExt,
    useItemSetsExt,
    useItemSortingExt,
    useUiBlockingExt,
    useTreeTogglerExt,
    useItemActionExt,
    useUndoRedoExt,
    useHotkeysExt,
    useModelSnapshotExt,
    usePaginationExt, useInfiniteScrollingExt
} from "../components/extensions.js"
import { useTreeComponent } from "../entities/tree.js"

const sampleFolderModel = {
    1: {name: "Test folder"},
    2: {name: "Parent"},
    3: {name: "Deeper folder", parent: "2"},
}
const sampleFolderIndex = () => new FolderIndex(cloneDeep(sampleFolderModel))

const entityIndexModel = {
    test: {folder: 0, name: "Another file"},
    test2: {folder: 0, name: "Dummy"},
    deep1: {folder: 2, name: "Test file"},
    deep2: {folder: 3, name: "Other file"}
}
const entityIndex = () => {
    const index = new MappingIndex(entityIndexModel, ['name', 'folder'])
    index.filterProps = ['name']
    return index
}
const treeIndex = () => new TreeIndex(sampleFolderIndex(), entityIndex())

const getNewTreeIndex = (folders, files) => new TreeIndex(new FolderIndex(folders), new MappingIndex(files, ['name', 'folder']))

const emptyFolderIndex = new FolderIndex({})
const emptyMappingIndex = new MappingIndex({}, ['name', 'folder'])
const emptyTreeIndex = new TreeIndex(emptyFolderIndex, emptyMappingIndex)

const basicItemActions = [
    {icon: "edit", action: () => d('edit')},
    {icon: "delete", action: () => d('delete')}
]

function getBasicTreeStackSample(props = {}) {
    return <TreeComponentRenderer treeIndex={treeIndex()} {...props} />
}

function getBasicTreeStackSelectionSample(props = {}) {
    const [selection, setSelection] = useState([
    //    'folder 2', 'folder 3'
    ])
    const buttons = [
        {name: 'Add to set', disabled: !selection.length, onPressed: () => sets.openAddToSetModal(selection)}
    ]
    return <TreeComponentRenderer buttons={buttons} treeIndex={treeIndex()} selection={selection} setSelection={setSelection} {...props} />
}

function getEmptyTreeStackSample(props = {}) {
    return <TreeComponentRenderer treeIndex={emptyTreeIndex} {...props} />
}

function getFullTreeStackSample(id, props = {}, confirmation) {
    const tree = useMemo(() => treeIndex(), [
        id
    ])
    const [selection, setSelection] = useState([])
    const buttons = [
        {
            icon: "add",
            name: "New", onPressed: () => d('add')},
        {
            icon: "delete",
            onPressed: () => confirmation && confirmation.open('delete...')
        }
    ]
    const deleteIndex = (node) => {
        if (node.nodeType === 'leaf') {
            tree.leafIndex.deleteEntity(node.index)
        }
    }
    const itemActions = [
        {icon: 'add', action: () => d('noop')},
        {icon: "edit", action: () => d('edit')},
        {
            icon: "delete",
//            action: deleteIndex,
            action:
                (node) => confirmation && confirmation.open(
                    {
                        msg: 'Do you really want to delete the entry?',
                        confirmed: () => {
                            deleteIndex(node)
                        }
                    }
                )
        }
    ]
    return <TreeComponentRenderer treeIndex={tree} header="buttons marking auto filter" footer="auto marking" selection={selection} setSelection={setSelection}
    itemActions={itemActions} buttons={buttons} {...props} />

}

function TestTree(props = {}) {
    const index = useMemo(() =>
            // emptyTreeIndex,
            treeIndex(),
        [])

    return useTreeComponent({
        ...props,
        entityIndex: index,
        spacing: 2,
        header: 'toggler buttons filter',
        footer: 'count sets selection undo export',
        height: "450px",
        extensions: [
            useTreeRendererExt(),
            useItemCountExt(),
            useItemFilterExt({
                filterInfoTop: false,
                controls: FILTER.CONTROL.CASE_SENSITIVE | FILTER.CONTROL.OR | FILTER.CONTROL.MODE
            }),
            useTreeTogglerExt(),
            useItemFocusExt(),
            useItemSetsExt({
                userSets: true,
                autoSets: [
                    FILTER.SETS.MARKED
                ]
            }),
            useItemSelectionExt(
                {
                    treeSelection: true
                }),
            useItemButtonsExt({
                reverse: true,
                maxButtons: 2,
                getButtons: ({ container, treeIndex, exts }) => [
                    {
                        icon: 'delete',
                        action: {
                            hotkey: 'delete',
                            confirm: "Do you really want to delete?",
                            can: (node) => (!container.selection || !container.selection.length) && node.nodeType === 'leaf',
                            exec: (node) => {
                                const index = node.index
                                const entity = treeIndex.leafIndex.getEntityObject(index)
                                const exec = async () => treeIndex.leafIndex.deleteEntity(index)
                                exts.process({
                                    exec,
                                    undo: async () => treeIndex.leafIndex.setEntityObject(entity, false),
                                    redo: exec
                                })
                            }
                        }
                    },
                    {icon: 'edit', onPressed: node => d('DO IT!', node)},
                    {icon: 'more', onPressed: node => d('DO IT!', node)}
                ]
            }),
            useItemExportExt(),
            useUndoRedoExt(),
            useHotkeysExt(),
            useModelSnapshotExt({ always: true}),
            useUiBlockingExt(),
            useButtonsExt({
                getButtons: ({ container, treeIndex, exts }) => [
                    {
                        icon: 'add',
                        name: 'New',
                        compact: true,
                        onPressed: () => exts.api.focus.focusItemByViewIndex(3)
                    },
                    {
                        icon: 'delete',
                        action: {
                            hotkey: 'delete',
                            confirm: `Do you really want to delete these ${container.selection.length} entries?`,
                            can: () => container.selection && container.selection.length && !container.selection.some(x => x.startsWith('folder')),
                            exec: () => {
                                const deletes = []
                                for (const id of container.selection) {
                                    const [,value] = id.split(' ')
                                    const idx = treeIndex.leafIndex.getEntityByPropValue('value', value)
                                    deletes.push(idx)
                                }
                                const deletedEntities = treeIndex.leafIndex.getEntityObjects(deletes)
                                const exec = async () => {
                                    await new Promise(resolve => setTimeout(resolve, 2500))
                                    treeIndex.leafIndex.deleteEntities(deletes)
                                }
                                exts.process({
                                    exec,
                                    abort: () => d('ABORTING...'),
                                    undo:
                                        async () => {
                                            await new Promise(resolve => setTimeout(resolve, 2500))
                                            treeIndex.leafIndex.setEntityObjects(deletedEntities)
                                        },
                                    redo: exec
                                })
                            }
                        }
                    }
                ]
            })
        ],
    })
}

function TestComponent() {
    const entityIndex = useMemo(() => {
            const folderIndex = new FolderIndex(
                {
                    '1': {name: "Empty folder"},
                    '2': {name: "Parent"},
                    '3': {name: "Deeper folder", parent: "2"},
                    '4': {name: "Deepest folder", parent: "3"},
                }
            )
            const files = {
                file: {name: "Another file", count: 0},
                file2: {folder: '1', name: "Dummy", count: 0},
                file3: {folder: '2', name: "Test file", count: 0},
                file4: {folder: '2', name: "Other file", count: 0}
            }
            for (let i = 0; i < 200; i++) {
                const folderId = i % 8
                const folder = folderId < 5 && folderId > 0 ? `${folderId}` : undefined
                files['gfile' + i] = {name: 'Generated ' + i, count: 0, folder}
            }

            const fileIndex = new MappingIndex(
                files, [
                    'folder', 'name', 'count'
                ]
            )
            return new FolderTreeIndex(folderIndex, fileIndex)
        },
    []
    )
    const parentEntityIndex = useMemo(() => {
        return new NodeWithParentTreeIndex(new MappingIndex({
            '4': {name: 'SubSub folder', count: 0, parent: '3'},
            '2': {name: 'My file', count: 3, parent: '1'},
            '1': {name: 'Parent', count: 0, parent: undefined},
            '3': {name: 'Sub folder', count: 0, parent: '1'},
        }, ['name', 'count', 'parent']), 'parent')
    }, [])

    return <MyTreeComponent entityIndex={entityIndex} />
}

function MyTreeComponent({ entityIndex }) {
    return useTreeComponent({
        entityIndex,
        header: "buttons toggler filter sorting sets",
        footer: "count selection undo",
        height: '400px',
        render: (node) => {
            return <div>{node.entity.name} {!node.isContainer && <span>[{node.entity.count}]</span>}</div>
        },
        extensions: [
            useItemCountExt(),
            useItemFocusExt(),
            useTreeRendererExt(),
            useTreeTogglerExt(),
            useItemSelectionExt({
                syncing: true,
                treeSelection: true
            }),
            useItemFilterExt({
                filterOptions: {
                    result: FILTER.RESULT.FLAT_DIRECT
                }
            }),
            useItemSortingExt(),
            useItemSetsExt({
                userSets: true,
                autoSets: [
                    FILTER.SETS.MARKED
                ]
            }),
            /*
            useItemButtonsExt({
                getButtons: ({ entityIndex }) => [
                    {
                        icon: 'edit',
                        action: {
                            can: node => !node.isContainer,
                            exec: (node) => {
                                const old = entityIndex.getEntityPropValue(node.index, 'count')
                                entityIndex.setEntityPropValue(node.index, 'count', (old ?? 0) + 1)
                            }
                        }
                    },
                    {
                        icon: 'delete',
                        action: {
                            confirm: "Really?",
                            exec: (node) => entityIndex.deleteEntity(node.index)
                        }
                    }
                ]
            }),

             */
            useInfiniteScrollingExt(),
            useUndoRedoExt(),
            useButtonsExt({
                getButtons: ({ view, exts, entityIndex, container }) => [
                    {
                        icon: 'info',
                        onPressed: () => {
                            d(entityIndex.getModel(), view.nodes)
                        }
                    },
                    {
                        icon: 'edit',
                        onPressed: () => {
                            d(entityIndex.getSubtreeEntities(2))
                            /*
                            entityIndex.setEntityObject({
                                index: 0,
                                value: 'Ffoo',
                                parent: undefined,
//                                value: entityIndex.getNewContainerId(),
                                name: 'My new Folder' + entityIndex.length,
                            }, true)
                             */
                        }
                    },
                    {
                        icon: 'delete',
                        action: {
                            hotkey: 'delete',
                            confirm: `Do you really want to delete these ${container.selection.length} entries?`,
                            exec: () => {
                                let deleteIndices = []
                                for (const id of container.selection) {
                                    const index = entityIndex.getEntityForId(id)
                                    const indices = entityIndex.getSubtreeEntities(index)
                                    deleteIndices = unique(deleteIndices, indices)
                                }
                                const deletedEntities = entityIndex.getEntityObjects(deleteIndices)
                                const exec = async () => {
                                    entityIndex.deleteEntities(deleteIndices)
                                }
                                exts.process({
                                    exec,
                                    undo:
                                        async () => {
                                            entityIndex.setEntityObjects(d(deletedEntities))
                                        },
                                    redo: exec
                                })
                            }
                        }
                    }

                ]
            })
        ]
    })
}

function TreeContent() {
    const ConfirmModal = useConfirmation()
    return <>
        <Section name="Entity Tree"
                 samples={[
                     {
                         name: 'Test component',
                         code: '<TestComponent />',
                         elem: <TestComponent />,
                     },
                     /*
                     {
                         name: "Testing...",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} />',
                         elem: TestStack({
                             header: "buttons sets expand filter",
                             buttons: [{icon: 'add'}],
                             filterOptions: {
                                 result: FILTER.RESULT.FLAT_SUBTREES,
                                 xisFilterVisible: FILTER.MATCH.LEAFS
                             },
                             controls: FILTER.CONTROL.OR | FILTER.CONTROL.CASE_SENSITIVE | FILTER.CONTROL.MODE,
                             footer: "count sorting marking",
                             xselectable: x => x.startsWith('leaf')
                         })
                     }
                     ,
                     {
                         name: "Temp Test TreeStack (with multi-selection)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} />',
                         elem: getBasicTreeStackSelectionSample({header: "buttons sets expand filter", filterOptions: {result: FILTER.RESULT.FLAT_SUBTREES, xisFilterVisible: FILTER.MATCH.LEAFS}, controls: CONTROL.OR | CONTROL.CASE_SENSITIVE | CONTROL.MODE, footer: "marking", xselectable: x => x.startsWith('leaf')})
                     },
                     {
                         name: "Temp Test Normal TreeStack (with treeSelection)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} treeSelection />',
                         elem: getBasicTreeStackSelectionSample({header: "expand sets filter", treeSelection: true, filterOptions: {caseSensitive: true, not: true, result: FILTER.RESULT.FLAT_DIRECT}, footer: 'totals marking', boxed: true, height: "400px"})
                     },

                     {
                         name: "Normal TreeStack",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} />',
                         elem: getBasicTreeStackSample()
                     },
                     {
                         name: "Fixed width TreeStack",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} width="200px" />',
                         elem: getBasicTreeStackSample({width: "200px"})
                     },
                     {
                         name: "Fixed height TreeStack",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} height="200px" />',
                         elem: getBasicTreeStackSample({height: "300px"})
                     },
                     {
                         name: "Max-Height TreeStack",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} maxHeight="150px" />',
                         elem: getBasicTreeStackSample({maxHeight: "150px"})
                     },
                     {
                         name: "Max-Height TreeStack with expand all",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} maxHeight="150px" />',
                         elem: getBasicTreeStackSample({maxHeight: "150px"})
                     },
                     {
                         name: "Normal TreeStack (always expanded)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} alwaysExpanded />',
                         elem: getBasicTreeStackSample({alwaysExpanded: true})
                     },
                     {
                         name: "Normal TreeStack (with multi-selection)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} />',
                         elem: getBasicTreeStackSelectionSample({})
                     },
                     {
                         name: "Normal TreeStack (with treeSelection)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} treeSelection />',
                         elem: getBasicTreeStackSelectionSample({treeSelection: true})
                     },
                     {
                         name: "Normal TreeStack (with multi-selection without folders)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} allowFolderSelection={false} />',
                         elem: getBasicTreeStackSelectionSample({allowFolderSelection: false})
                     },
                     {
                         name: "Normal TreeStack (with multi-selection without folders and max-selection)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} allowFolderSelection={false} />',
                         elem: getBasicTreeStackSelectionSample({allowFolderSelection: false, maxSelection: 1})
                     },
                     {
                         name: "Normal TreeStack (with max-1-selection)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} maxSelection={1} />',
                         elem: getBasicTreeStackSelectionSample({maxSelection: 1})
                     },
                     {
                         name: "Normal TreeStack (with custom itemAction)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} itemAction={(node) => console.log(node)} />',
                         elem: getBasicTreeStackSelectionSample({itemAction: node => console.log(node)})
                     },
                     {
                         name: "Basic TreeComponentRenderer with item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getBasicTreeStackSample({itemActions: basicItemActions})
                     },
                     {
                         name: "Basic TreeComponentRenderer with reverse item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getBasicTreeStackSample({itemActions: basicItemActions, reverse: true})
                     },
                     {
                         name: "Full TreeComponentRenderer with item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample(1,{}, ConfirmModal)
                     },
                     {
                         name: "Boxed full TreeComponentRenderer with item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample(2,{boxed: true}, ConfirmModal)
                     },
                     {
                         name: "Boxed full TreeComponentRenderer with item actions (reverse)",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample(2,{boxed: true, reverse: true}, ConfirmModal)
                     },
                     {
                         name: "Empty compact TreeComponentRenderer",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample(3,{boxed: true, compact: true, treeIndex: emptyTreeIndex}, ConfirmModal)
                     },
                     {
                         name: "Empty TreeComponentRenderer",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getEmptyTreeStackSample()
                     },
                     {
                         name: "Empty TreeComponentRenderer with custom empty message",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getEmptyTreeStackSample({emptyMsg: "This is a custom empty message!", minHeight: "150px"})
                     }
                     */

                 ]} />
        {ConfirmModal.Modals}
    </>
}

export {
    TreeContent
}