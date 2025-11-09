import { useState } from "react"
import { d, getNewModelId } from "core/helper"
import { MappingIndex } from "core/entity"
import { ButtonGroup, FormGrid, InputCells } from "components/form"
import { OkCancelLayout } from "components/layout"
import { FILTER } from "core/filter"
import { Select, CheckboxCells, CustomCells, SelectCells } from "components/form"
import { useUpdateOnEntityIndexChanges } from "components/common"
import { Centered } from "components/layout"
import { TreeComponentRenderer } from "./folders.js"
import { useItemFilterExt, useItemSelectionExt, useUnrenderedTreeComponent } from "components/extensions"

class SetsIndex extends MappingIndex {
    constructor(model) {
        super(model, ['name', 'exclusive', 'result', 'ids'])
    }

    getOptions() {
        const options = []
        const entities = this.getEntityObjects()
        for (const { value, name } of entities) {
            options.push({ id: value, name })
        }
        return options
    }
}

function UserSetSelectorModal({ close, options, save }) {
    const [userSetId, setUserSetId] = useState(() => {
        return options.length ? options[0].id : undefined
    })
    return (
        <OkCancelLayout cancel={close} ok={() => save(userSetId)}>
            <FormGrid>
                <SelectCells name="Set" value={userSetId} set={setUserSetId} options={options} />
            </FormGrid>
        </OkCancelLayout>
    )
}

const resultOptions = [
    {id: FILTER.RESULT.FLAT_DIRECT, name: 'List'},
    {id: FILTER.RESULT.FLAT_SUBTREES, name: 'List (with subtree)'},
    {id: FILTER.RESULT.SUBTREES, name: 'Subtree'},
    {id: FILTER.RESULT.WITH_ANCESTORS, name: 'Subtree (with ancestors)'},
]

function SetItemsSelector({ treeIndex, value, set, ...props }) {

    const tree = useUnrenderedTreeComponent({
        treeIndex,
        extensions: [
            useItemSelectionExt({ selection: value, setSelection: set }),
            useItemFilterExt()
        ]
    })
    return <TreeComponentRenderer
        tree={tree}
        header="filter"
        footer="marking"
        { ...props }
    />
}

function UserSetForm({ treeIndex, model, setsIndex, paramsRef }) {
    const getSetter = (prop) => {
        return (value) => setsIndex.setEntityPropValue(model.index, prop, value)
    }
    return (
        <FormGrid>
            <InputCells name="Name" value={model.name} set={getSetter('name')} />
            <CheckboxCells name="Exclusive" value={model.exclusive === true} set={getSetter('exclusive')} />
            <SelectCells name="Show as" value={model.result ?? FILTER.RESULT.FLAT_DIRECT} set={getSetter('result')} options={resultOptions} />
            <CustomCells name="Elements">
                <SetItemsSelector
                    {...paramsRef.current}
                    treeIndex={treeIndex}
                    value={model.ids}
                    set={getSetter('ids')}
                />
            </CustomCells>
        </FormGrid>
    )
}

function UserSetManagerModal({ close, save, treeIndex, paramsRef, setsIndex }) {

    useUpdateOnEntityIndexChanges(setsIndex)

    const options = setsIndex.getOptions()
    const [selected, setSelected] = useState(options.length ? options[0].id : undefined)

    const addSet = () => {
        const value = getNewModelId()
        setsIndex.setEntityObject({
            value,
            name: 'User Set ' + (options.length + 1),
            exclusive: true,
            ids: []
        })
        setSelected(value)
    }

    const deleteSet = () => {
        const index = setsIndex.getEntityByPropValue('value', selected)
        setsIndex.deleteEntity(index)
        setSelected(setsIndex.length ? setsIndex.getEntityValue(0) : undefined)
    }

    const buttons = [
        {icon: 'add', onPressed: addSet},
        {icon: 'delete', disabled: selected === undefined,  onPressed: deleteSet},
    ]

    const currIndex = setsIndex.getEntityByPropValue('value', selected)
    const currModel = setsIndex.getEntityObject(currIndex)

    return (
        <OkCancelLayout cancel={close} ok={() => save(setsIndex.model)}>
            <div className="stack-h gap-2">
                <div className="p-2">
                    <div className="stack-h">
                        <Select value={selected} set={setSelected} options={options} />
                        <ButtonGroup buttons={buttons} />
                    </div>
                </div>
                <div className="p-2 auto">

                    {options.length ?
                        <UserSetForm treeIndex={treeIndex} model={currModel} setsIndex={setsIndex} paramsRef={paramsRef} /> :
                        <Centered className="text-xs">No set available!</Centered>
                    }
                </div>
            </div>
        </OkCancelLayout>
    )
}

export {
    SetsIndex,
    UserSetSelectorModal,
    UserSetManagerModal
}