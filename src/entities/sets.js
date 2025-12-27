import { useState } from "react"
import { getNewModelId } from "core/helper"
import { MappingIndex, FolderTreeIndex } from "core/entity"
import { ButtonGroup, FormGrid, InputCells } from "components/form"
import { OkCancelLayout } from "components/layout"
import { FILTER } from "core/filter"
import { Select, CheckboxCells, CustomCells, SelectCells } from "components/form"
import { useUpdateOnEntityIndexChanges } from "components/common"
import { Centered } from "components/layout"
import { useStackComponent } from "./stack"
import { useItemFilterExt, useItemSelectionExt, useTreeRendererExt, usePaginationExt } from "components/extensions"
import { useTreeComponent } from "./tree.js"

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

function SetItemsSelector({ entityIndex, value, set, ...props }) {
    if (entityIndex instanceof FolderTreeIndex) {
        return useTreeComponent({
            entityIndex,
            header: "filter",
            footer: "selection pagination",
            height: "300px",
            extensions: [
                useTreeRendererExt(),
                useItemSelectionExt({ selection: value, setSelection: set }),
                useItemFilterExt()
            ]
        })
    }
    return useStackComponent({
        entityIndex,
        header: "filter",
        footer: "selection pagination",
        height: "300px",
        extensions: [
            useItemSelectionExt({ selection: value, setSelection: set }),
            usePaginationExt(),
            useItemFilterExt()
        ]
    })
}


function UserSetForm({ entityIndex, model, setsIndex, paramsRef }) {
    const isTree = entityIndex instanceof FolderTreeIndex
    const getSetter = (prop) => {
        return (value) => setsIndex.setEntityPropValue(model.index, prop, value)
    }
    return (
        <FormGrid>
            <InputCells name="Name" value={model.name} set={getSetter('name')} />
            <CheckboxCells name="Exclusive" value={model.exclusive === true} set={getSetter('exclusive')} />
            {isTree && <SelectCells name="Show as" value={model.result ?? FILTER.RESULT.FLAT_DIRECT} set={getSetter('result')} options={resultOptions} />}
            <CustomCells name="Elements">
                <SetItemsSelector
                    {...paramsRef.current}
                    entityIndex={entityIndex}
                    value={model.ids}
                    set={getSetter('ids')}
                />
            </CustomCells>
        </FormGrid>
    )
}

function UserSetManagerModal({ close, save, entityIndex, paramsRef, setsIndex }) {

    useUpdateOnEntityIndexChanges(setsIndex)

    const options = setsIndex.getOptions()
    const [selected, setSelected] = useState(options.length ? options[0].id : undefined)

    const addSet = () => {
        const value = getNewModelId()
        setsIndex.setEntityObject({
            value,
            name: 'User Set ' + (options.length + 1),
            result: FILTER.RESULT.FLAT_DIRECT,
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
                        <UserSetForm entityIndex={entityIndex} model={currModel} setsIndex={setsIndex} paramsRef={paramsRef} /> :
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