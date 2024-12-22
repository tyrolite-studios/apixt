import { d, isFunction, cloneDeep, without } from "./helper"

class EntityIndex {
    constructor() {
        this.lastModified = Date.now()
        this.updates = []
        this._allIndices = null
        this.suspendNotifications = false
        this.valueIndexing = false
        this.valueTemplate = ""
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
            return
        }
        this._allIndices = null
        if (!this.listeners) {
            return
        }
        for (let listener of this.listeners) {
            listener(this.updates)
        }
        this.updates = []
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

    hasEntityDim() {
        return this.hasEntityProp("width")
    }

    hasEntityProp(name) {
        return this.getEntityProps().includes(name)
    }

    hasEntityImage(index) {
        return true
    }

    getSizeX() {
        return this.sizeX
    }

    getSizeY() {
        return this.sizeY
    }

    getIndexDim() {
        return { x: this.getSizeX(), y: this.getSizeY() }
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
        } else if (prop === "value") {
            return this.items[index]
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

    getEntityValue(index) {
        return this.items[index]
    }

    getEntityByPropValue(prop, value) {
        let i = 0
        const iMax = this.length
        while (i < iMax) {
            if (this.getEntityPropValue(i, prop) === value) {
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

    getValueTemplate() {
        return this.valueTemplate
    }

    setValueTemplate(value) {
        this.valueTemplate = value
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

    getView({ start = 0, length, page, match, sort } = {}) {
        const items = this.getMatchingEntities(match)
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
            this.doUpdates(d(updates), true)
        }
        this.suspendNotifications = false
        this.notify()
    }

    assignAutoProps(updatedIndices = []) {
        return []
    }

    handleEntityValueReplace(oldValue, newValue) {}

    doUpdates(updates, overwrite) {
        const props = []
        const autoProps =
            overwrite && !this.hasEntityDim() ? [] : this.getAutoProps()
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
        if (notify) this.notify()
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

export { EntityIndex, MappingIndex, SimpleMappingIndex, extractLcProps }
