import { EntityIndex } from "core/entity"
import { EntityPicker } from "components/common"
import { d, md5, sortDesc, formatDate } from "core/helper"

class HistoryEntryIndex extends EntityIndex {
    constructor(model, maxItems) {
        super()
        this.maxItems = maxItems
        this.model = model
        while (model.length > maxItems) {
            model.pop()
        }
        this.items = model.map(({ request, assignments }) =>
            this.getHash(request, assignments)
        )
        this.filterProps = [
            ["request", "path"],
            ["request", "method"]
        ]
    }

    setMaxItems(value) {
        this.maxItems = value
    }

    getHash(request, assignments) {
        return md5({ request, assignments })
    }

    getEntityProps() {
        return [
            ...super.getEntityProps(),
            "timestamp",
            "request",
            "assignments",
            "bodyType"
        ]
    }

    getEntityPropValue(index, prop) {
        if (["request", "assignments"].includes(prop)) {
            return this.model[index][prop] ?? {}
        }
        if (["timestamp", "bodyType"].includes(prop)) {
            return this.model[index][prop]
        }
        return super.getEntityPropValue(index, prop)
    }

    addFirst(request, assignments, bodyType) {
        const hash = this.getHash(request, assignments)

        this.suspendNotifications = true

        const baseObj = { timestamp: Date.now() }
        const currIndex = this.items.indexOf(hash)
        if (currIndex > -1) {
            this.items.splice(currIndex, 1)
            this.model.splice(currIndex, 1)
        }
        this.items.unshift(hash)
        this.model.unshift({ request, assignments, bodyType, ...baseObj })

        this.limitItems()
        this.suspendNotifications = false

        this.notify()
    }

    deleteEntities(indices) {
        if (!indices.length) return

        const sorted = indices.toSorted(sortDesc)
        for (const index of sorted) {
            if (index < 0 || index >= this.items.length) continue
            this.items.splice(index, 1)
            this.model.splice(index, 1)
        }
        this.notify()
    }

    limitItems() {
        if (this.items.length <= this.maxItems) return

        const indices = []
        let i = this.maxItems
        while (i < this.items.length) {
            indices.push(i)
            i++
        }
        this.deleteEntities(indices)
    }
}

function HistoryEntryPicker({ historyEntryIndex, api, ...props }) {
    const matchesApi = (idx) =>
        historyEntryIndex.getEntityPropValue(idx, "request").api === api

    return (
        <EntityPicker
            entityIndex={historyEntryIndex}
            matcher={matchesApi}
            render={({ request, timestamp }) => (
                <div className="stack-v w-full text-xs">
                    <div className="text-xs">{request.path}</div>
                    <div className="stack-h w-full opacity-50">
                        <div>{request.method}</div>
                        <div className="auto text-right">
                            {formatDate(timestamp)}
                        </div>
                    </div>
                </div>
            )}
            {...props}
        />
    )
}

export { HistoryEntryIndex, HistoryEntryPicker }
