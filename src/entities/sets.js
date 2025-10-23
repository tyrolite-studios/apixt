import { useState, useRef, useMemo, useContext } from "react"
import { d, ClassNames, cloneDeep, getNewModelId } from "core/helper"
import { MappingIndex } from "core/entity"
import { ButtonGroup, FormGrid, InputCells } from "components/form"
import { useModalWindow } from "components/modal"
import { OkCancelLayout } from "components/layout"
import { without } from "core/helper"
import { FILTER } from "core/entity-tree"
import { Select } from "components/form"
import { CheckboxCells, CustomCells, SelectCells } from "components/form"
import { useUpdateOnEntityIndexChanges } from "components/common"
import { Centered } from "components/layout"
import { TreeIndexStack } from "./folders.js"
import { AppContext } from "components/context"

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

function UserSetForm({ model, setsIndex, paramsRef }) {
    const getSetter = (prop) => {
        return (value) => setsIndex.setEntityPropValue(model.index, prop, value)
    }

    return (
        <FormGrid>
            <InputCells name="Name" value={model.name} set={getSetter('name')} />
            <CheckboxCells name="Exclusive" value={model.exclusive === true} set={getSetter('exclusive')} />
            <SelectCells name="Show as" value={model.result ?? FILTER.RESULT.FLAT_DIRECT} set={getSetter('result')} options={resultOptions} />
            <CustomCells name="Elements">
                <TreeIndexStack
                    header="filter"
                    footer="marking"
                    {...paramsRef.current}
                    selection={model.ids}
                    setSelection={getSetter('ids')}
                />
            </CustomCells>
        </FormGrid>
    )
}

function UserSetManagerModal({ close, save, paramsRef, setsIndex }) {

    useUpdateOnEntityIndexChanges(setsIndex)

    const options = setsIndex.getOptions()
    const [selected, setSelected] = useState(options.length ? options[0].id : undefined)

    const addSet = () => {
        const value = getNewModelId()
        setsIndex.setEntityObject({
            value,
            name: 'New Set ' + options.length,
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
                <div className="p-2">

                    {options.length ?
                        <UserSetForm model={currModel} setsIndex={setsIndex} paramsRef={paramsRef} /> :
                        <Centered>No set selected!</Centered>
                    }
                </div>
            </div>
        </OkCancelLayout>
    )
}

function useSets({ fixSets = [], persistId, userSets = false, preventNoSetActive = false, ...props }) {
    const aContext = useContext(AppContext)

    const AddToSetModal = useModalWindow()
    const ManageSetsModal = useModalWindow()

    const paramsRef = useRef(null)
    const [ userSetsData, setUserSetsDataRaw ] = useState(() => {
        if (userSets && persistId) {
            return aContext.globalStorage.getJson('sets.' + persistId, {})
        }
        return {}
    })
    const setUserSetsData = (value) => {
        setUserSetsDataRaw(value)
        if (userSets && persistId) {
            aContext.globalStorage.setJson('sets.' + persistId, value)
        }
    }

    const userSetItems = useMemo(() => {
        if (!userSets) return []

        const items = []
        for (const [ id, { ids, ...itemProps } ] of Object.entries(userSetsData)) {
            items.push({ id, userSet: true, getHasId: () => (id) => ids.includes(id), ...itemProps })
        }
        return items
    }, [userSetsData])

    const userSetOptions = userSetItems.map(({ id, name }) => ({id, name}))
    const [ actives, setActives ]  = useState(props.actives ?? [])

    const items = [
        ...fixSets,
        ...userSetItems
    ]

    const id2item = {}
    const exclusives = new Set()
    for (const item of items) {
        const { id, exclusive } = item
        if (exclusive) exclusives.add(id)

        id2item[item.id] = item
    }

    const result = useMemo(() => {
        if (!actives.length) return

        let highest = FILTER.RESULT.FLAT_DIRECT
        for (const id of actives) {
            const set = id2item[id]
            if (!set.result) continue

            highest = Math.max(highest, set.result)
        }
        return highest
    }, [actives, userSetsData])

    if (!items.length) return

    const getInSet = (params) => {
        const checks = []
        for (const { id, getHasId } of items) {
            if (!actives.includes(id) || !getHasId) continue

            checks.push(getHasId(params))
        }
        return !checks.length ? undefined : (id) => checks.some(check => check(id))
    }

    const toggle = (id) => {
        if (actives.includes(id)) {
            if (actives.length !== 1 || !preventNoSetActive) {
                setActives(without(actives, id))
            }
            return
        }
        const base = actives.length === 1 && exclusives.has(actives[0]) ? [] : actives;
        setActives(exclusives.has(id) ? [ id ] : [ ...base, id ])
    }
    const api = {
        items,
        toggle,
        actives,
        setActives,
        getInSet,
        result,
        paramsRef,
        userSetsAllowed: userSets,
        createUserSet: (props) => {
            const id = 'testing'
            const newData = cloneDeep(userSetsData)
            newData[id] = { ...props }
            setUserSetsData(newData)
        },
        openSetManagerModal: () => {
            const setsIndex = new SetsIndex(userSetsData)
            ManageSetsModal.open({
                setsIndex,
                paramsRef,
                save: (newUserSetsData) => {
                    setUserSetsData(newUserSetsData)
                    ManageSetsModal.close()
                }
            })
        },
        openAddToSetModal: (ids) => {
            AddToSetModal.open({
                options: userSetOptions,
                save: (userSetId) => {
                    api.addIdsToUserSet(userSetId, ids)
                    AddToSetModal.close()
                }
            })
        },
        addIdsToUserSet: (userSetId, ids) => {
            const set = id2item[userSetId]
            if (!set.userSet) return

            const newData = cloneDeep(userSetsData)
            const dataIds = newData[userSetId].ids
            for (const id of ids) {
                if (dataIds.includes(id)) continue

                dataIds.push(id)
            }
            setUserSetsData(newData)
        },
        Modals: <>
            <AddToSetModal.content>
                <UserSetSelectorModal {...AddToSetModal.props} />
            </AddToSetModal.content>

            <ManageSetsModal.content>
                <UserSetManagerModal {...ManageSetsModal.props} />
            </ManageSetsModal.content>
        </>
    }
    return api
}

export {
    useSets,
    SetsIndex
}