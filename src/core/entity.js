import {
    isFunction,
    cloneDeep,
    without,
    isArray,
    isObject,
    sortAsc,
    sortDesc,
    sortNatAsc,
    sortNatDesc,
    unique,
    getNewModelId
} from "./helper"

class EntityIndex {
    constructor() {
        this.lastModified = Date.now()
        this.updates = []
        this._allIndices = null
        this.suspendNotifications = false
        this.valueIndexing = false
        // TODO remove
        this.filterProps = []
        this._filterValueGetter = null
    }

    getFilterValueGetter() {
        if (this._filterValueGetter === null) {
            const getter = []
            for (const prop of this.filterProps) {
                if (isArray(prop)) {
                    getter.push((index) => {
                        let pos = 0
                        let value = this.getEntityPropValue(index, prop[pos])
                        if (prop.length === 1) return value

                        while (pos < prop.length - 1) {
                            if (!isObject(value)) return
                            pos++
                            value = value[prop[pos]]
                        }
                        return value
                    })
                } else {
                    getter.push((index) => this.getEntityPropValue(index, prop))
                }
            }
            this._filterValueGetter = getter
        }
        return this._filterValueGetter
    }

    addListener(listener) {
        if (!this.listeners) {
            this.listeners = []
        }
        this.listeners.push(listener)
    }

    removeListener(listener) {
        if (!this.listeners) {
            return
        }
        if (this.listeners.includes(listener)) {
            this.listeners.splice(this.listeners.indexOf(listener), 1)
        }
    }

    notify() {
        this.lastModified = Date.now()
        if (this.suspendNotifications) {
            return false
        }
        this._allIndices = null
        if (!this.listeners) {
            return true
        }
        for (let listener of this.listeners) {
            listener(this.updates)
        }
        this.updates = []
        return true
    }

    addPropUpdate(index) {
        this.updates.push({ type: "update", index })
    }

    addDeleteUpdate(index) {
        this.updates.push({
            type: "delete",
            index,
            value: this.getEntityValue(index)
        })
    }

    hasIndex(index) {
        return index >= 0 && index < this.length
    }

    hasUniqueValues() {
        return true
    }

    hasPropValueMatch(prop, matchFunction) {
        const indices = this.allIndices
        for (let index of indices) {
            const value = this.getEntityPropValue(index, prop)
            if (value !== undefined && matchFunction(value)) {
                return true
            }
        }
        return false
    }

    hasPropValue(prop, value) {
        return this.hasPropValueMatch(prop, (item) => value === item)
    }

    hasEntityProp(name) {
        return this.getEntityProps().includes(name)
    }

    get length() {
        return this.items.length
    }

    get allIndices() {
        if (this._allIndices === null) {
            const indices = []
            let i = 0
            let iMax = this.length
            while (i < iMax) {
                indices.push(i++)
            }
            this._allIndices = indices
        }
        return this._allIndices
    }

    getAutoProps() {
        return []
    }

    getEntityProps() {
        return ["index", "value"]
    }

    getEntityPropValue(index, prop) {
        if (prop === "index") {
            return index
        }
        if (prop === "value") {
            return this.getEntityValue(index)
        }
    }

    getEntityObject(index, props = null) {
        const obj = {}
        const objProps = props ? props : this.getEntityProps()
        for (let prop of objProps) {
            obj[prop] = this.getEntityPropValue(index, prop)
        }
        return obj
    }

    getEntityForId(id) {
        return this.items.indexOf(id)
    }

    getEntityValue(index) {
        return this.items[index]
    }

    getEntityByPropValue(prop, value) {
        let i = 0
        const iMax = this.length
        while (i < iMax) {
            if (this.getEntityPropValue(i, prop) == value) {
                return i
            }
            i++
        }
        return null
    }

    getEntitiesByPropValue(prop, value) {
        const found = []
        let i = 0
        const iMax = this.length
        while (i < iMax) {
            if (this.getEntityPropValue(i, prop) === value) {
                found.push(i)
            }
            i++
        }
        return found
    }

    getEntityFilterString(index) {
        return this.hasEntityProp('name') ? this.getEntityPropValue(index, 'name') : this.getEntityValue(index)
    }

    getPropValues(prop) {
        const values = []
        const indices = this.allIndices
        for (let index of indices) {
            values.push(this.getEntityPropValue(index, prop))
        }
        return values
    }

    getEntityObjects(indices = null) {
        const result = []
        if (indices === null) {
            indices = this.allIndices
        }
        for (let index of indices) {
            result.push(this.getEntityObject(index))
        }
        return result
    }

    getMatchingEntities(match, indices = this.allIndices) {
        if (!match || !isFunction(match)) return indices

        return indices.filter(match)
    }

    getView({ start = 0, length, page, match, sort, filter } = {}) {
        let items = this.getMatchingEntities(match)
        const isFiltered = filter && this.filterProps.length
        if (filter && !isFiltered) {
            console.error(`Entity list was filtered by "${filter}" but not filterable props were specified in filterProps!`)
        }

        let unfiltered = items
        if (isFiltered) {
            const lcFilter = filter.toLowerCase()

            const getPropValues = this.getFilterValueGetter()
            unfiltered = [...items]
            items = items.filter(index => {
                for (const getPropValue of getPropValues) {
                    const value = getPropValue(index)
                    if (value === undefined) return false

                    if (value.toLowerCase().includes(lcFilter)) return true
                }
                return false
            })
        }
        if (sort) items.sort(sort)

        const matches = []
        const count = items.length
        if (length === undefined) {
            length = count
        } else if (page !== undefined) {
            start = length * (page - 1)
        }
        const max = Math.min(count, start + length)
        let i = start
        while (i < max) {
            matches.push(items[i])
            i++
        }
        return {
            isFiltered,
            unfiltered,
            matches,
            count,
            pages:
                length !== undefined && count > 0
                    ? Math.max(1, Math.ceil(count / length))
                    : 1
        }
    }

    setItems(items) {
        this.items = items
        this.notify()
    }

    setEntityValue(index, value) {
        this.items[index] = value
        this.notify()
    }

    handleEntityValueReplace(oldValue, newValue) {}

    setEntityPropValue(index, prop, value) {
        switch (prop) {
            case "index":
                break

            case "value":
                this.setEntityValue(index, value)
                break
        }
    }

    setEntityObject(obj, overwrite = false) {
        return this.setEntityObjects([obj], overwrite)[0]
    }

    setEntityObjects(objects, overwrite = false) {
        if (objects.length === 0) {
            return []
        }
        this.suspendNotifications = true

        const result = []
        let changeIndex = []
        let i = 0
        const iMax = this.length
        while (i < iMax) {
            changeIndex.push({
                newValue: this.getEntityValue(i),
                objIndex: null,
                currIndex: i++
            })
        }
        let objIndex = 0
        const transfers = []
        for (let obj of objects) {
            result.push(null)
            if (obj.index !== undefined) {
                if (overwrite) {
                    const oldObj = changeIndex[obj.index]
                    if (oldObj.newValue !== obj.value) {
                        transfers.push([oldObj.newValue, obj.value])
                        oldObj.newValue = obj.value
                    }
                    oldObj.objIndex = objIndex
                } else {
                    changeIndex.splice(obj.index, 0, {
                        newValue: obj.value,
                        objIndex,
                        currIndex: null
                    })
                }
            } else if (obj.value !== undefined) {
                changeIndex.push({
                    newValue: obj.value,
                    objIndex,
                    currIndex: null
                })
            }
            objIndex++
        }
        const newIndex = []
        const updates = []
        i = 0
        if (this.valueIndexing) {
            for (let item of changeIndex) {
                const index = i++
                newIndex.push(item.newValue)
                item.newValue = index
                if (item.currIndex === index && item.objIndex === null) {
                    continue
                }
                if (item.objIndex !== null) {
                    result[item.objIndex] = index
                    updates.push([
                        index,
                        { ...objects[item.objIndex], value: index }
                    ])
                } else {
                    updates.push([
                        index,
                        {
                            ...this.getEntityObject(item.currIndex),
                            value: index
                        }
                    ])
                }
            }
        } else {
            if (this.indexSorting) {
                changeIndex.sort((a, b) => {
                    return this.indexSorting(a.newValue, b.newValue)
                })
            }

            for (let item of changeIndex) {
                const index = i++
                newIndex.push(item.newValue)
                if (item.currIndex === index && item.objIndex === null) {
                    continue
                }
                if (item.objIndex !== null) {
                    result[item.objIndex] = index
                    updates.push([index, objects[item.objIndex]])
                } else {
                    updates.push([index, this.getEntityObject(item.currIndex)])
                }
            }
            if (transfers.length) {
                for (let [oldValue, newValue] of transfers) {
                    if (!newIndex.includes(oldValue)) {
                        this.handleEntityValueReplace(oldValue, newValue)
                    }
                }
            }
        }
        this.setItems(newIndex)
        this.doUpdates(updates, overwrite)

        this.suspendNotifications = false
        this.notify()
        return result
    }

    deleteEntityPropValues(index) {}

    deleteEntity(index) {
        this.deleteEntities([index])
    }

    deleteEntities(indices) {
        if (!indices.length) return

        this.suspendNotifications = true
        const newItems = []
        const length = this.length
        let i = 0
        while (i < length) {
            if (!indices.includes(i)) {
                newItems.push(this.getEntityValue(i))
            } else {
                this.addDeleteUpdate(i)
                this.deleteEntityPropValues(i)
            }
            i++
        }
        const updates = []
        if (this.valueIndexing) {
            let index = 0
            for (let oldIndex of newItems) {
                if (oldIndex !== index) {
                    updates.push([
                        index,
                        { ...this.getEntityObject(oldIndex), value: index }
                    ])
                }
                newItems[index] = index
                index++
            }
        }

        this.setItems(newItems)
        if (updates.length) {
            this.doUpdates(updates, true)
        }
        this.suspendNotifications = false
        this.notify()
    }

    assignAutoProps(updatedIndices = []) {
        return []
    }

    getSortOptions() {
        const prop = this.hasEntityProp('name') ? 'name' : 'value'
        return [
            {
                id: 'alpha',
                name: 'Alpha',
                getSort: (asc) => {
                    return (a, b) => {
                        const propA = this.getEntityPropValue(a.index, prop)
                        const propB = this.getEntityPropValue(b.index, prop)
                        return asc ? sortAsc(propA, propB) : sortDesc(propA, propB)
                    }
                }
            },
            {
                id: 'natalpha',
                name: 'Alpha (natural)',
                getSort: (asc) => {
                    return (a, b) => {
                        const propA = this.getEntityPropValue(a.index, prop)
                        const propB = this.getEntityPropValue(b.index, prop)
                        return asc ? sortNatAsc(propA, propB) : sortNatDesc(propA, propB)
                    }
                }
            },
        ]
    }

    doUpdates(updates, overwrite) {
        const props = []
        const autoProps =
            overwrite ? [] : this.getAutoProps()
        for (let prop of this.getEntityProps()) {
            if (prop === "index" || autoProps.includes(prop)) {
                continue
            }
            props.push(prop)
        }
        const updateIndices = []
        for (let [index, obj] of updates) {
            updateIndices.push(index)
            for (let prop of props) {
                this.setEntityPropValue(index, prop, obj[prop])
            }
        }
        if (autoProps.length > 0) {
            const reassignProps = this.assignAutoProps(updateIndices)
            if (reassignProps.length > 0) {
                for (let [index, obj] of updates) {
                    for (let prop of reassignProps) {
                        this.setEntityPropValue(index, prop, obj[prop])
                    }
                }
            }
        }
    }

    getNewId() {
        return getNewModelId()
    }

    getModel() {}

    setModel(model, notify = true) {
        this._allIndices = null
        if (notify) this.notify()
    }
}

class MappingIndex extends EntityIndex {
    constructor(model, props = []) {
        super()
        this.props = props
        this.setModel(cloneDeep(model), false)
    }

    setModel(model, notify = true) {
        this.model = model ?? {}
        this.items = [...Object.keys(this.model)]
        super.setModel(model, notify)
    }

    getModel() {
        return this.model
    }

    getEntityProps() {
        return [...super.getEntityProps(), ...this.props]
    }

    getModelValue(index, prop) {
        const value = this.getEntityValue(index)
        if (value === undefined) return

        return this.model[value][prop]
    }

    getEntityPropValue(index, prop) {
        if (this.props.includes(prop)) {
            return this.getModelValue(index, prop)
        }
        return super.getEntityPropValue(index, prop)
    }

    setEntityPropValue(index, prop, value) {
        if (this.props.includes(prop)) {
            this.setModelValue(index, prop, value)
            this.notify()
            return
        }
        return super.setEntityPropValue(index, prop, value)
    }

    setModelValue(index, prop, value) {
        this.model[this.getEntityValue(index)][prop] = value
    }

    getNewModelValue() {
        return {}
    }

    setEntityValue(index, value) {
        const oldValue = this.getEntityValue(index)
        if (this.model[oldValue] === undefined) {
            this.model[oldValue] = this.getNewModelValue()
        }
        if (oldValue !== value) {
            this.handleEntityValueReplace(oldValue, value)
        }
        this.items[index] = value
        this.notify()
    }

    deleteEntity(index) {
        super.deleteEntity(index)
    }

    deleteEntities(indices) {
        for (const index of indices) {
            delete this.model[this.getEntityValue(index)]
        }
        super.deleteEntities(indices)
    }

    handleEntityValueReplace(oldValue, newValue) {
        this.model[newValue] = this.model[oldValue]
        delete this.model[oldValue]
    }
}

class SimpleMappingIndex extends MappingIndex {
    constructor(model, keyValueProp = "keyval") {
        super(model, [keyValueProp])
        this.keyValueProp = keyValueProp
    }

    getModelValue(index, prop) {
        const value = this.getEntityValue(index)
        if (value === undefined) return

        return this.model[value]
    }

    setModelValue(index, prop, value) {
        this.model[this.getEntityValue(index)] = value
        this.notify()
    }

    getNewModelValue() {
        return undefined
    }
}

function extractLcProps(entityIndex, prop, except) {
    const values = entityIndex.getPropValues(prop).map((x) => x.toLowerCase())
    if (!except) return values

    return without(values, except[prop].toLowerCase())
}

const getPathDiff = (pathA, pathB, factor = 1) => {
    const aLen = pathA.length
    const bLen = pathB.length
    const iMax = Math.min(aLen, bLen)

    let i = 0
    while (i < iMax && pathA[i] === pathB[i]) i++

    if (i === iMax) {
        if (aLen === bLen) return [0, null]

        return [(aLen < bLen ? -1  : 1) * factor, null]
    }
    return [0, i]
}

const getFolderEntityDiff = (folderPath, entityPath, reverse = false) => {
    const comp = getPathDiff(folderPath, entityPath)
    return (comp[1] === null) ? [reverse ? 1 : -1, null] : comp
}

class TreeIndex extends EntityIndex {
}

class NodeWithParentTreeIndex extends TreeIndex {
    constructor(nodeIndex, parentProp) {
        super()
        this.nodeIndex = nodeIndex
        this.parentProp = parentProp
        this.buildItems()
    }

    buildItems() {
        this.items = [ ...this.nodeIndex.allIndices ]
        let remaining = []
        const indexToAncestors = new Map()
        const valueToIndex = new Map()
        this.valueToIndex = valueToIndex
        this.indexToAncestors = indexToAncestors
        for (const index of this.items) {
            valueToIndex.set(this.nodeIndex.getEntityValue(index), index)
            const parent = this.nodeIndex.getEntityPropValue(index, this.parentProp)
            const ancestors = parent ? [parent] : []
            indexToAncestors.set(index, ancestors)
            if (ancestors.length > 0) remaining.push(index)
        }
        while (remaining.length) {
            const newRemaining = []
            for (const index of remaining) {
                const [rootValue, ...ancestors] = indexToAncestors.get(index)
                const rootAncestors = indexToAncestors.get(valueToIndex.get(rootValue))
                indexToAncestors.set(index, [...rootAncestors, rootValue, ...ancestors])
                if (rootAncestors.length) newRemaining.push(index)
            }
            remaining = newRemaining
        }


        this.treeSort = (a, b, sub) => {
            const valueA = this.nodeIndex.getEntityValue(a)
            const pathA = [...this.indexToAncestors.get(a), valueA]
            const valueB = this.nodeIndex.getEntityValue(b)
            const pathB = [...this.indexToAncestors.get(b), valueB]
            /*
            if (folderA !== folderB) {
                const [comp, i] = folderA ? getFolderEntityDiff(pathA, pathB) : getFolderEntityDiff(pathB, pathA, true)
                return comp !== 0 ? comp : sub(idToIndex.get(pathA[i]), idToIndex.get(pathB[i]))
            } else {

             */
            const [comp, i] = getPathDiff(pathA, pathB)
            if (comp === 0) {
                return i === null ? sub(a, b) : sub(this.valueToIndex.get(pathA[i]), this.valueToIndex.get(pathB[i]))
            }
            return comp
            // }
        }

        this.items.sort((a, b) => this.treeSort(a, b, sortAsc))
    }

    hasEntityProp(name) {
        return this.nodeIndex.hasEntityProp(name)
    }

    getEntityProps() {
        return this.nodeIndex.getEntityProps()
    }

    getEntityValue(index) {
        return this.nodeIndex.getEntityValue(this.items[index])
    }

    getEntityLevel(value) {
        return this.getAncestors(value).length + 1
    }

    getParent(value) {
        const ancestors = this.getAncestors(value)
        return ancestors.length ? ancestors[ancestors.length - 1] : undefined
    }

    getAncestors(id) {
        return this.indexToAncestors.get(this.valueToIndex.get(id))
    }

    getEntityForId(id) {
    }

    canHaveChildren(id) {
        return true
    }

    getAncestorNames(id) {
        const ids = this.getAncestors(id)
        const names = []
        for (const id of ids) {
            const resolved = this.valueToIndex.get(id)
            names.push(
                this.nodeIndex.getEntityPropValue(resolved, 'name')
            )
        }
        return names
    }

    getEntityObject(index, ...params) {
        const obj = this.nodeIndex.getEntityObject(this.items[index], ...params)
        obj.index = index
        return obj
    }
}


const folderBit = 1 << 28
const withoutFolderBit =  ~folderBit

const asFolderId = (id) => id === undefined ? id : 'F' + id
const asEntityId = (id) => id === undefined ? id : 'E' + id

class FolderTreeIndex extends TreeIndex {
    constructor(folderIndex, entityIndex, parentProps = {}) {
        super()
        const { entityParent = 'folder', folderParent = 'parent' } = parentProps
        const notify = () => this.notify()
        folderIndex.addListener(notify)
        entityIndex.addListener(notify)
        this.folderIndex = folderIndex
        this.folderParentProp = folderParent
        this.entityIndex = entityIndex
        this.entityParentProp = entityParent
        this.entityProps = unique(folderIndex.getEntityProps(), entityIndex.getEntityProps())
        this.buildItems()
    }

    hasEntityProp(name) {
        return this.entityProps.includes(name)
    }

    getEntityProps() {
        return this.entityProps
    }

    getEntityValue(index) {
        const resolved = this.items[index]
        const value = this.callWithResolvedIndex('getEntityValue', index)

        return resolved & folderBit ? asFolderId(value) : asEntityId(value)
    }

    buildItems() {
        const { folderIndex, entityIndex } = this
        const allFolderIndices = folderIndex.allIndices
        const idToAncestors = new Map()
        const idToIndex = new Map()
        const indexToId = new Map()
        let remaining = []
        const items = []

        for (const index of allFolderIndices) {
            const parent = asFolderId(this.folderIndex.getEntityPropValue(index, this.folderParentProp))
            const folderIndex = index | folderBit
            items.push(folderIndex)

            const id = asFolderId(this.folderIndex.getEntityValue(index))
            indexToId.set(folderIndex, id)
            idToIndex.set(id, folderIndex)
            if (parent === undefined) {
                idToAncestors.set(id, [])
                continue
            }
            idToAncestors.set(id, [parent])
            remaining.push(id)
        }
        while (remaining.length) {
            const newRemaining = []
            for (const index of remaining) {
                const currPath = idToAncestors.get(index)
                const lastParent = currPath[0]
                const parentPath = idToAncestors.get(lastParent)
                if (!parentPath.length) continue

                idToAncestors.set(index, [...parentPath, ...currPath])
                newRemaining.push(index)
            }
            remaining = newRemaining
        }
        const entityIndices = entityIndex.allIndices
        for (const index of entityIndices) {
            items.push(index)
            const folder = asFolderId(entityIndex.getEntityPropValue(index, this.entityParentProp))
            const id = asEntityId(this.entityIndex.getEntityValue(index))
            indexToId.set(index, id)
            idToIndex.set(id, index)
            if (folder === undefined) {
                idToAncestors.set(id, [])
                continue
            }
            idToAncestors.set(id, [...idToAncestors.get(folder), folder])
        }
        this.treeSort = (a, b, sub) => {
            const folderA = (a & folderBit) !== 0
            const folderB = (b & folderBit) !== 0
            const pathA = [...idToAncestors.get(indexToId.get(a))]
            if (folderA) {
                pathA.push(indexToId.get(a))
            }
            const pathB = [...idToAncestors.get(indexToId.get(b))]
            if (folderB) {
                pathB.push(indexToId.get(b))
            }
            if (folderA !== folderB) {
                const [comp, i] = folderA ? getFolderEntityDiff(pathA, pathB) : getFolderEntityDiff(pathB, pathA, true)
                return comp !== 0 ? comp : sub(idToIndex.get(pathA[i]), idToIndex.get(pathB[i]))
            } else {
                const [comp, i] = folderA ? getPathDiff(pathA, pathB) : getPathDiff(pathA, pathB, -1)
                if (comp === 0) {
                    return i === null ? sub(a, b) : sub(idToIndex.get(pathA[i]), idToIndex.get(pathB[i]))
                }
                return comp
            }
        }
        this.idToIndex = idToIndex
        this.indexToId = indexToId
        this.idToAncestors = idToAncestors
        this.items = items

        // TODO: sorting should be triggered from outside by option to prevent
        // double sorting
        this.sortBy(sortAsc)

    }

    rebuildItems() {
        this.buildItems()
        this.notify()
    }

    sortBy(subSort) {
        this.items.sort((a, b) => {
            return this.treeSort(a, b, (a, b) => {
                const aName = this.callMethod('getEntityPropValue', a & folderBit ? a & withoutFolderBit : a, 'name')
                const bName = this.callMethod('getEntityPropValue', b & folderBit ? b & withoutFolderBit : b, 'name')
                return subSort(aName, bName)
            })
        })
    }

    getSortOptions() {
        const getSortGetter = (ascSort, descSort) => (asc, postSort) => {
            const subSort = asc ? ascSort : descSort
            const entitySort = (a, b) => {
                const aName = this.callMethod('getEntityPropValue', a & folderBit ? a & withoutFolderBit : a, 'name')
                const bName = this.callMethod('getEntityPropValue', b & folderBit ? b & withoutFolderBit : b, 'name')
                return subSort(aName, bName)
            }
            return postSort ?
                (a, b) => entitySort(this.items[a.index], this.items[b.index]) :
                (a, b) => this.treeSort(this.items[a.index], this.items[b.index], entitySort)
        }
        return [
            {
                id: 'alpha',
                name: 'Alpha',
                getSort: getSortGetter(sortAsc, sortDesc)
            }
            ,
            {
                id: 'natalpha',
                name: 'Alpha (natural)',
                getSort: getSortGetter(sortNatAsc, sortNatDesc)
            },
        ]
    }

    callMethod(method, resolved, ...params) {
        if (resolved & folderBit) {
            return this.folderIndex[method](resolved & withoutFolderBit, ...params)
        }
        return this.entityIndex[method](resolved, ...params)
    }

    callWithResolvedIndex(method, index, ...params) {
        const resolved = this.items[index]
        if (resolved & folderBit) {
            return this.folderIndex[method](resolved & withoutFolderBit, ...params)
        }
        return this.entityIndex[method](resolved, ...params)
    }

    getEntityForId(id) {
        const index = this.idToIndex.get(id)
        return this.items.indexOf(index)
    }

    isContainerId(id) {
        return id.startsWith('F')
    }

    getNewContainerId() {
        return 'F' + this.folderIndex.getNewId()
    }

    getNewEntityId() {
        return 'E' + this.entityIndex.getNewId()
    }

    getEntityLevel(id) {
        return this.idToAncestors.get(id).length + 1
    }

    getParent(id) {
        const ancestors = this.idToAncestors.get(id)
        return ancestors.length ? ancestors[ancestors.length - 1] : undefined
    }

    getAncestors(id) {
        return this.idToAncestors.get(id)
    }

    getAncestorNames(id) {
        const ids = this.getAncestors(id)
        const names = []
        for (const id of ids) {
            const resolved = this.items[this.getEntityForId(id)]
            names.push(
                resolved & folderBit ?
                    this.folderIndex.getEntityPropValue(resolved & withoutFolderBit, 'name') :
                    this.entityIndex.getEntityPropValue(resolved, 'name')
            )
        }
        return names
    }

    getEntityFilterString(index) {
        return this.callWithResolvedIndex('getEntityFilterString', index)
    }

    getEntityPropValue(index, prop, ...params) {
        if (prop === 'index') return index
        if (prop === 'value') return this.getEntityValue(index)
        const value = this.callWithResolvedIndex('getEntityPropValue', index, prop, ...params)
        if (value !== undefined && [this.entityParentProp, this.folderParentProp].includes(prop)) return 'F' + value
        return value
    }

    setEntityValue(index, value) {
        const resolved = this.items[index]
        const newValue = value.substring(1)
        let changed = false
        if (value.startsWith('E')) {
            changed = this.entityIndex.getEntityValue(resolved) !== newValue
            if (changed) this.entityIndex.setEntityValue(resolved, value.substring(1))
        } else if (value.startsWith('F')) {
            const resolvedIndex = resolved & withoutFolderBit
            const currValue = this.folderIndex.getEntityValue(resolvedIndex)
            changed = currValue !== newValue
            if (changed) {
                const folderIndices = this.folderIndex.getMatchingEntities(
            currIndex => currIndex !== resolvedIndex && this.folderIndex.getEntityPropValue(currIndex, this.folderParentProp) === currValue
                )
                const foundFolders = !folderIndices.length ? [] : this.folderIndex.getEntityObjects(folderIndices)
                for (const obj of foundFolders) {
                    this.folderIndex.setEntityPropValue(obj.index, this.folderParentProp, newValue)
                }
                const entityIndices = this.entityIndex.getMatchingEntities(
                    currIndex => this.entityIndex.getEntityPropValue(currIndex, this.entityParentProp) === currValue
                )
                const foundEntities = !entityIndices.length ? [] : this.entityIndex.getEntityObjects(entityIndices)
                for (const obj of foundEntities) {
                    this.entityIndex.setEntityPropValue(obj.index, this.entityParentProp, newValue)
                }
                this.folderIndex.setEntityValue(resolved & withoutFolderBit, newValue)
            }
        }
        if (changed) {
            this.rebuildItems()
            this.notify()
        }
    }

    setEntityPropValue(index, prop, ...params) {
        if (prop === 'index') return index

        return this.callWithResolvedIndex('setEntityPropValue', index, prop, ...params)
    }

    getEntityChildren(index) {
        const level = this.getEntityLevel(this.indexToId.get(this.items[index]))
        let i = index + 1
        const iMax = this.items.length
        const children = []
        while (i < iMax && this.getEntityLevel(this.indexToId.get(this.items[i])) > level) {
            children.push(i)
            i++
        }
        return children
    }

    getResolvedIndices(indices) {
        const folders = []
        const entities = []
        for (const index of indices) {
            const resolved = this.items[index]
            if (resolved & folderBit) {
                folders.push(resolved & withoutFolderBit)
            } else {
                entities.push(resolved)
            }
        }
        return [folders, entities]
    }

    deleteEntity(index) {
        this.deleteEntities([index])
    }

    deleteEntities(indices) {
        if (!indices.length) return

        const deleteFolders = new Set()
        const deleteEntities = new Set()
        for (const index of indices) {
            const resolved = this.items[index]
            this.suspendNotifications = true
            if (resolved & folderBit) {
                const children = this.getEntityChildren(index)
                children.push(index)
                const [folderIndices, entityIndices] = this.getResolvedIndices(children)
                folderIndices.forEach(deleteFolders.add, deleteFolders)
                entityIndices.forEach(deleteEntities.add, deleteEntities)
            } else {
                deleteEntities.add(resolved)
            }
        }
        this.folderIndex.deleteEntities([ ...deleteFolders ])
        this.entityIndex.deleteEntities([ ...deleteEntities ])
        this.suspendNotifications = false
        this.rebuildItems()
    }

    getEntityObject(index, ...params) {
        const obj = this.callWithResolvedIndex('getEntityObject', index, ...params)
        obj.index = index
        const resolved = this.items[index]
        const id = resolved & folderBit ? asFolderId(obj.value) : asEntityId(obj.value)
        obj.value = id
        if (obj[this.entityParentProp] !== undefined) {
            obj[this.entityParentProp] = 'F' + obj[this.entityParentProp]
        }
        if (obj[this.folderParentProp] !== undefined) {
            obj[this.folderParentProp] = 'F' + obj[this.folderParentProp]
        }
        return obj
    }

    setEntityObjects(objects, overwrite = false) {
        const entityObjects = []
        const folderObjects = []
        const resolvedFolders = new Set()
        const resolvedEntities = new Set()
        const folderMap = new Map()

        const resultMap = []
        for (const object of objects) {
            resultMap.push(object.value[0])
            const newObject = {
                value: object.value.substring(1),
            }
            if (object.value.startsWith('F')) {
                newObject.parent = object.parent ? object.parent.substring(1) : undefined
                if (overwrite) {
                    const resolved = this.items[object.index]
                    newObject.index = resolved & withoutFolderBit
                    resolvedFolders.add(newObject.index)

                    const currValue = this.folderIndex.getEntityValue(newObject.index)
                    if (currValue !== newObject.value) {
                        folderMap.set(currValue, newObject.value)
                    }
                }
                folderObjects.push({
                    ...object,
                    ...newObject
                })
            } else if (object.value.startsWith('E')) {
                newObject.folder = object.folder ? object.folder.substring(1) : undefined
                if (overwrite) {
                    const resolved = this.items[object.index]
                    newObject.index = resolved
                    resolvedEntities.add(resolved)
                }
                entityObjects.push({
                    ...object,
                    ...newObject
                })
            }
        }
        if (folderMap.size) {
            const findValues = [...folderMap.keys()]
            const folderIndices = this.folderIndex.getMatchingEntities(
                index => !resolvedFolders.has(index) && findValues.includes(this.folderIndex.getEntityPropValue(index, this.folderParentProp))
            )
            const foundFolders = !folderIndices.length ? [] : this.folderIndex.getEntityObjects(folderIndices)
            for (const obj of foundFolders) {
                obj.parent = folderMap.get(obj.parent)
                folderObjects.push(obj)
            }
            const entityIndices = this.entityIndex.getMatchingEntities(
                index => !resolvedEntities.has(index) && findValues.includes(this.entityIndex.getEntityPropValue(index, this.entityParentProp))
            )
            const foundEntities = !entityIndices.length ? [] : this.entityIndex.getEntityObjects(entityIndices)
            for (const obj of foundEntities) {
                obj.folder = folderMap.get(obj.folder)
                entityObjects.push(obj)
            }
        }
        this.suspendNotifications = true
        let folderResult = []
        if (folderObjects.length) {
            folderResult = this.folderIndex.setEntityObjects(folderObjects, overwrite)
        }
        let entityResult = []
        if (entityObjects.length) {
            entityResult = this.entityIndex.setEntityObjects(entityObjects, overwrite)
        }
        this.suspendNotifications = false
        this.rebuildItems()
        const result = []
        for (const [index, char] of resultMap.entries()) {
            let value = null
            if (char === 'F') {
                value = folderResult.shift()
            } else if (char === 'E') {
                value = entityResult.shift()
            }
            if (value === null) {
                result.push(null)
                continue
            }
            value = objects[index].value
            result.push(this.items.indexOf(this.idToIndex.get(value)))
        }
        return result
    }

    canHaveChildren(id) {
        return id.startsWith('F')
    }

    hasChildren(index) {
        if (index === this.length - 1) return false

        const curr = this.items[index]
        const next = this.items[index + 1]
        return this.idToAncestors.get(curr).length === this.idToAncestors.get(next) - 1
    }

    getSubtreeEntities(index) {
        const result = [index]
        const level = this.getEntityLevel(this.indexToId.get(this.items[index]))
        let i = index + 1
        while (i < this.items.length && level < this.getEntityLevel(this.indexToId.get(this.items[i]))) {
            result.push(i)
            i++
        }
        return result
    }

    getModel() {
        return [
            this.folderIndex.getModel(),
            this.entityIndex.getModel()
        ]
    }

    setModel(model, notify = true) {
        const [ folderModel, entityModel ] = model
        this.folderIndex.setModel(folderModel, false)
        this.entityIndex.setModel(entityModel, false)
        this.rebuildItems()
        super.setModel(model, notify)
    }
}

export {
    EntityIndex,
    MappingIndex,
    SimpleMappingIndex,
    extractLcProps,
    FolderTreeIndex,
    NodeWithParentTreeIndex
}
