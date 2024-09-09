class EntityIndex {
    constructor() {
        this.updates = []
        this.allIndices = null
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
        if (this.suspendNotifications) {
            return
        }
        this.allIndices = null
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
        return index >= 0 && index < this.getLength()
    }

    hasUniqueValues() {
        return true
    }

    hasPropValueMatch(prop, matchFunction) {
        const indices = this.getAllIndices()
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

    getLength() {
        return this.items.length
    }

    getAllIndices() {
        if (this.allIndices === null) {
            const indices = []
            let i = 0
            let iMax = this.getLength()
            while (i < iMax) {
                indices.push(i++)
            }
            this.allIndices = indices
        }
        return this.allIndices
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
        const iMax = this.getLength()
        while (i < iMax) {
            if (this.getEntityPropValue(i, prop) === value) {
                return i
            }
            i++
        }
        return null
    }

    getValueTemplate() {
        return this.valueTemplate
    }

    setValueTemplate(value) {
        this.valueTemplate = value
    }

    getPropValues(prop) {
        const values = []
        const indices = this.getAllIndices()
        for (let index of indices) {
            values.push(this.getEntityPropValue(index, prop))
        }
        return values
    }

    getEntityObjects(indices = null) {
        const result = []
        if (indices === null) {
            indices = this.getAllIndices()
        }
        for (let index of indices) {
            result.push(this.getEntityObject(index))
        }
        return result
    }

    getMatchingEntities(indices, match) {
        return indices
    }

    getView(start, length = null, match = null, sort = null) {
        let indices = this.getAllIndices()
        if (Array.isArray(match)) {
            if (match.length == 2 && typeof match[1] === "function") {
                indices = indices.filter(match[1])
            }
            match = match.length ? match[0] : null
        }
        const items = this.getMatchingEntities(indices, match)

        // TODO sorting here

        const matches = []
        const count = items.length
        if (length === null) {
            length = count
        }
        const max = Math.min(count, start + length)
        let i = start
        while (i < max) {
            matches.push(items[i])
            i++
        }
        return {
            matches,
            count
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
        const iMax = this.getLength()
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
        const length = this.getLength()
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

class SimpleIndex extends EntityIndex {
    constructor(model, key = "items") {
        super()
        this.model = model
        this.key = key
        this.items = model[this.key]
    }
}

export { EntityIndex, SimpleIndex }
