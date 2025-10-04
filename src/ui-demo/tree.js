import { useState, useMemo } from "react"
import { Section, DashedRect } from "./common.js"
import { TreeIndexStack, CONTROL } from "../entities/folders"
import { MappingIndex } from "../core/entity"
import { FILTER, FolderIndex, TreeIndex } from "../core/entity-tree"
import { cloneDeep, d } from "../core/helper"
import { useConfirmation } from "../components/common.js"

const sampleFolderModel = {
    1: {name: "Want 2"},
    2: {name: "Deeper And Deeper"},
    3: {name: "Whatever", parent: "2"},
}
const sampleFolderIndex = () => new FolderIndex(cloneDeep(sampleFolderModel))

const entityIndexModel = {
    test: {folder: 0, name: "Hey man!"},
    test2: {folder: 0, name: "More and more"},
    deep1: {folder: 2, name: "Recall!"},
    deep2: {folder: 3, name: "Deepest"}
}
const entityIndex = () => {
    const index = new MappingIndex(entityIndexModel, ['name', 'folder'])
    index.filterProps = ['name']
    return index
}
const treeIndex = () => new TreeIndex(sampleFolderIndex(), entityIndex())

const emptyFolderIndex = new FolderIndex({})
const emptyMappingIndex = new MappingIndex({}, ['name', 'folder'])
const emptyTreeIndex = new TreeIndex(emptyFolderIndex, emptyMappingIndex)

const basicItemActions = [
    {icon: "edit", action: () => d('edit')},
    {icon: "delete", action: () => d('delete')}
]

function getBasicTreeStackSample(props = {}) {
    return <TreeIndexStack treeIndex={treeIndex()} {...props} />
}

function getBasicTreeStackSelectionSample(props = {}) {
    const [selection, setSelection] = useState([
    //    'folder 2', 'folder 3'
    ])
    return <TreeIndexStack treeIndex={treeIndex()} selection={selection} setSelection={setSelection} {...props} />
}


function getEmptyTreeStackSample(props = {}) {
    return <TreeIndexStack treeIndex={emptyTreeIndex} {...props} />
}

function getFullTreeStackSample(id, props = {}, confirmation) {
    const tree = useMemo(() => treeIndex(), [
        id
    ])
    const [selection, setSelection] = useState([])
    const buttons = [
        {icon: "add", name: "New", onPressed: () => d('add')}, {
        icon: "delete",
            onPressed: () => confirmation && confirmation.open('delete...')
    }]
    const deleteIndex = (node) => {
        if (node.nodeType === 'leaf') {
            tree.leafIndex.deleteEntity(node.index)
        }
    }
    const itemActions = [
        {icon: "edit", action: () => d('edit')},
        {
            icon: "delete",
            // action: deleteIndex,
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
    return <TreeIndexStack treeIndex={tree} header="buttons marking auto filter" footer="auto marking" selection={selection} setSelection={setSelection}
    itemActions={itemActions} buttons={buttons} {...props} />

}

function TreeContent() {
    const ConfirmModal = useConfirmation()
    return <>
        <Section name="Tree Stack"
                 samples={[

                     {
                         name: "Temp Test TreeStack (with multi-selection)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} />',
                         elem: getBasicTreeStackSelectionSample({header: "expand filter", filterOptions: {result: FILTER.RESULT.FLAT_SUBTREES, isFilterVisible: FILTER.MATCH.LEAFS}, controls: CONTROL.OR | CONTROL.CASE_SENSITIVE | CONTROL.MODE, footer: "marking", xselectable: x => x.startsWith('leaf')})
                     },
                     {
                         name: "Temp Test Normal TreeStack (with treeSelection)",
                         code: '<TreeStackIndex treeIndex={myTreeIndex} selection={selection} setSelection={setSelection} treeSelection />',
                         elem: getBasicTreeStackSelectionSample({header: "expand filter", treeSelection: true, filterOptions: {caseSensitive: true, not: true, result: FILTER.RESULT.FLAT_DIRECT}, footer: 'marking', boxed: true, height: "400px"})
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
                         name: "Basic TreeIndexStack with item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getBasicTreeStackSample({itemActions: basicItemActions})
                     },
                     {
                         name: "Basic TreeIndexStack with reverse item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getBasicTreeStackSample({itemActions: basicItemActions, reverse: true})
                     },
                     {
                         name: "Full TreeIndexStack with item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample(1,{}, ConfirmModal)
                     },
                     {
                         name: "Boxed full TreeIndexStack with item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample(2,{boxed: true}, ConfirmModal)
                     },
                     {
                         name: "Boxed full TreeIndexStack with item actions (reverse)",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample(2,{boxed: true, reverse: true}, ConfirmModal)
                     },
                     {
                         name: "Empty compact TreeIndexStack",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample(3,{boxed: true, compact: true, treeIndex: emptyTreeIndex}, ConfirmModal)
                     },
                     {
                         name: "Empty TreeIndexStack",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getEmptyTreeStackSample()
                     },
                     {
                         name: "Empty TreeIndexStack with custom empty message",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getEmptyTreeStackSample({emptyMsg: "This is a custom empty message!", minHeight: "150px"})
                     },

                 ]} />
        {ConfirmModal.Modals}
    </>
}

export {
    TreeContent
}