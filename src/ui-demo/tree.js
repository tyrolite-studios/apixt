import { useState } from "react"
import { Section, DashedRect } from "./common.js"
import { TreeIndexStack, FolderIndex } from "../entities/folders"
import { MappingIndex, TreeIndex } from "../core/entity"
import { d } from "../core/helper"

const sampleFolderIndex = new FolderIndex({
    1: {name: "Want 2"},
    2: {name: "Deeper And Deeper"},
    3: {name: "Whatever", parent: "2"},
})
const entityIndex = new MappingIndex({
    test: {folder: 0, name: "Hey man!"},
    test2: {folder: 0, name: "More and more"},
    deep1: {folder: 2, name: "Recall!"},
    deep2: {folder: 3, name: "Deepest"}
}, ['name', 'folder'])
entityIndex.filterProps = ['name']
const treeIndex = new TreeIndex(sampleFolderIndex, entityIndex)

const emptyFolderIndex = new FolderIndex({})
const emptyMappingIndex = new MappingIndex({}, ['name', 'folder'])
const emptyTreeIndex = new TreeIndex(emptyFolderIndex, emptyMappingIndex)

const basicItemActions = [
    {icon: "edit", action: () => d('edit')},
    {icon: "delete", action: () => d('delete')}
]

function getBasicTreeStackSample(props = {}) {
    return <TreeIndexStack treeIndex={treeIndex} {...props} />
}

function getBasicTreeStackSelectionSample(props = {}) {
    const [selection, setSelection] = useState(['folder 2', 'folder 3'])
    return <TreeIndexStack treeIndex={treeIndex} selection={selection} setSelection={setSelection} {...props} />
}


function getEmptyTreeStackSample(props = {}) {
    return <TreeIndexStack treeIndex={emptyTreeIndex} {...props} />
}

function getFullTreeStackSample(props = {}) {
    const [selection, setSelection] = useState([])
    const buttons = [{icon: "add", name: "New", onPressed: () => d('add')}, {icon: "delete", onPressed: () => d('delete...')}]
    return <TreeIndexStack treeIndex={treeIndex} header="buttons marking auto filter" footer="auto marking" selection={selection} setSelection={setSelection}
    itemActions={basicItemActions} buttons={buttons} {...props} />

}

function TreeContent() {
    return <>
        <Section name="Tree Stack"
                 samples={[
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
                         elem: getFullTreeStackSample()
                     },
                     {
                         name: "Boxed full TreeIndexStack with item actions",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample({boxed: true})
                     },
                     {
                         name: "Empty compact TreeIndexStack",
                         code: '<MyModal.content name="Test Modal">Hello here is long text!</MyModal.content>',
                         elem: getFullTreeStackSample({boxed: true, compact: true, treeIndex: emptyTreeIndex})
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
    </>
}

export {
    TreeContent
}