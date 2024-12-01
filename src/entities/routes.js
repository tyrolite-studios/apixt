import { EntityIndex } from "core/entity"

class RouteIndex extends EntityIndex {
    constructor(routes) {
        super()
        this.model = routes
        this.items = routes.map((route) => route.path)
    }

    getEntityProps() {
        return [...super.getEntityProps(), "path", "methods"]
    }

    getEntityValue(index) {
        return this.items[index].path
    }

    getEntityPropValue(index, prop) {
        if (prop === "path") {
            return this.model[index].path
        }
        if (prop === "methods") return this.model[index].methods
        return super.getEntityPropValue(index, prop)
    }
}

export { RouteIndex }
