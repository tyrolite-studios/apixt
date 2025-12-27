import { useMemo } from "react"
import { Section } from "./common.js"
import { ClassNames, cloneDeep } from "../core/helper.js"
import { useStackComponent } from "../entities/stack.js"
import { MappingIndex } from "../core/entity.js"
import { useTreeComponent } from "../entities/tree.js"
import {
    useButtonsExt,
    useHotkeysExt, useInfiniteScrollingExt,
    useItemButtonsExt,
    useItemCountExt, useItemExportExt,
    useItemFilterExt,
    useItemFocusExt, useItemSelectionExt, useItemSetsExt, useItemSortingExt, useModelSnapshotExt, usePaginationExt,
    useTreeRendererExt,
    useTreeTogglerExt, useUiBlockingExt, useUndoRedoExt
} from "../components/extensions.js"
import { FILTER } from "../core/filter.js"

function MyStackTest({ model, ...props }) {
    const entityIndex = useMemo(() => {
        return new MappingIndex(...cloneDeep(model))
    }, [])
    return <DemoComponent entityIndex={entityIndex} {...props} />
}

function DemoComponent({ entityIndex, ...props }) {
    return useStackComponent({
        entityIndex,
        ...props
    })
}

const emptyModel = [{}]
const smallModel = [{
    'id1': {name: 'First entry'},
    'id2': {name: 'Second entry'},
    'id3': {name: 'Third entry'},
    'id4': {name: 'Fourth entry'},
    'id5': {name: 'Fifth entry'},
}, ['name']]

const model = {}
let max = 500
let i = 1
while (max > 0) {
    model['i' + i] = {
        name: 'Item no ' + i,
        count: 0
    }
    i++
    max--
}

const testEntityIndex = new MappingIndex(model, ['name', 'count'])

function ListComponent() {
    return <div>
        <MyList entityIndex={testEntityIndex} />
    </div>
}

function MyList({ entityIndex }) {
    return useStackComponent({
        entityIndex,
        render: ({ viewIndex, entity }) => <div className="stack-h gap-2">
            <div className="opacity-50">{viewIndex + 1}.</div>
            <div>{entity.name} [{entity.count}]</div>
        </div>,
        spacing: 1,
        header: 'buttons filter sets sorting',
        footer: 'count pagination selection',
        height: "350px",
        extensions: [
            useItemCountExt(),
            useItemFocusExt(),
            useItemSelectionExt(),
            useHotkeysExt(),
            useItemFilterExt({
                filterInfoTop: false,
                controls: FILTER.CONTROL.CASE_SENSITIVE | FILTER.CONTROL.OR | FILTER.CONTROL.MODE
            }),
            useItemSetsExt({
                userSets: true,
                autoSets: [
                    FILTER.SETS.MARKED
                ]
            }),
            useItemSortingExt({
                options: [
                    {id: 'natalpha', name: 'By natural'},
                    {id: 'alpha'}
                ]
            }),
            useButtonsExt({
                getButtons: ({ exts, entityIndex, container }) => [
                    {
                        icon: 'delete',
                        action: {
                            hotkey: 'delete',
                            confirm: `Do you really want to delete these ${container.selection.length} entries?`,
                            exec: () => {
                                const deletes = []
                                for (const id of container.selection) {
                                    const index = entityIndex.getEntityForId(id)
                                    deletes.push(index)
                                }
                                // const deletedEntities = entityIndex.getEntityObjects(deletes)
                                const exec = async () => {
                                    await new Promise(resolve => setTimeout(resolve, 2500))
                                    entityIndex.deleteEntities(deletes)
                                }
                                exts.process({
                                    exec,
                                    abort: () => d('ABORTING...'),
                                    undo:
                                        async () => {
                                            await new Promise(resolve => setTimeout(resolve, 2500))
                                            // treeIndex.leafIndex.setEntityObjects(deletedEntities)
                                        },
                                    redo: exec
                                })
                            }
                        }
                    }

                ]
            }),
            /*
            useItemButtonsExt({
                getButtons: ({ entityIndex }) => [
                    {
                        icon: 'edit',
                        action: {
                            exec: (node) => {
                                const old = entityIndex.getEntityPropValue(node.index, 'count')
                                entityIndex.setEntityPropValue(node.index, 'count', old + 1)
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
            usePaginationExt(),
            /*
            useInfiniteScrollingExt({
                switchDirection: true
            })

             */
        ]
    })
}

function StackContent() {
    return (
        <Section
            name="Entity Stack"
            samples={[
                {
                    name: 'List Component',
                    code: '<ListComponent />',
                    elem: <ListComponent />,
                },
                {
                    name: 'Empty no height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <MyStackTest model={emptyModel} />
                },
                {
                    name: 'Empty with height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <MyStackTest model={emptyModel} height="150px" />
                },
                {
                    name: 'Empty with min-height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <MyStackTest model={emptyModel} minHeight="150px" />
                },
                {
                    name: 'Empty with full height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <div style={{height: '150px'}}>
                        <MyStackTest model={emptyModel} height="100%" />
                    </div>
                },
                {
                    name: 'No height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <MyStackTest model={smallModel} />
                },
                {
                    name: 'Small height with scrollbar',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <MyStackTest model={smallModel} height="100px" />
                },
                {
                    name: 'Small maxheight with scrollbar',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <MyStackTest model={smallModel} maxHeight="100px" />
                },
                {
                    name: 'Big height no scrollbar',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <MyStackTest model={smallModel} height="250px" />
                },
                {
                    name: 'No spacing',
                    code: 'useStackComponent({\n' +
                        '    entityIndex: myEntityIndex,\n' +
                        '    spacing: 0\n' +
                        '})',
                    elem: <MyStackTest model={smallModel} spacing={0} />
                },
                /*
                {
                    name: 'Small height with scrollbar',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <LayoutTest style={{height: '150px'}} />,
                },
                {
                    name: 'Small max-height with scrollbar',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <LayoutTest style={{maxHeight: '150px'}} />,
                },
                {
                    name: 'Big height without scrollbar',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <LayoutTest style={{height: '350px'}} />,
                },
                {
                    name: 'Big max-height without scrollbar',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <LayoutTest style={{maxHeight: '350px'}} />,
                },
                {
                    name: 'Full-height without scrollbar',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <div style={{height: "500px"}}><LayoutTest style={{height: '100%'}} /></div>,
                },
                {
                    name: 'Empty with no height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <LayoutTest style={{height: '100%'}} empty />,
                },
                {
                    name: 'Empty with height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <LayoutTest style={{height: '250px'}} empty />,
                },
                {
                    name: 'Empty with min-height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <LayoutTest style={{minHeight: '250px'}} empty />,
                },
                {
                    name: 'Full-height',
                    code: 'useStackComponent({\n' +
                        '  entityIndex: myEntityIndex\n' +
                        '})',
                    elem: <div style={{height: "500px"}}><LayoutTest style={{height: '100%'}} empty /></div>,
                },
                 */
            ]}
        />
    )
}

export { StackContent }