import { EntityIndex } from "core/entity"
import { APIS } from "./apis"

class RouteIndex extends EntityIndex {
    constructor(routes) {
        super()
        this.model = routes
        this.items = routes.map((route) => route.path)
    }

    getEntityProps() {
        return [...super.getEntityProps(), "path", "methods", "api"]
    }

    getEntityValue(index) {
        return this.items[index].path
    }

    getEntityPropValue(index, prop) {
        if (["path", "api"].includes(prop)) {
            const value = this.model[index][prop]

            return value === undefined && prop === "api"
                ? APIS.OPTION.CURRENT
                : value
        }
        if (prop === "methods") return this.model[index].methods

        return super.getEntityPropValue(index, prop)
    }
}

function SimpleRoutePath({ path }) {
    const parts = path.substring(1).split("/")
    const elems = []
    let i = 0
    for (const part of parts) {
        elems.push(<div key={i + "_0"}>/</div>)
        if (part.startsWith(":")) {
            elems.push(
                <div
                    key={i + "_1"}
                    className="border-1 border-app-border text-xs"
                >
                    <span className="opacity-50">:{part.substring(1)}</span>
                </div>
            )
        } else {
            elems.push(<div key={i + "_1"}>{part}</div>)
        }
        i++
    }
    return <div className="stack-h">{elems}</div>
}

function RoutePath({ path, params = [] }) {
    const parts = path.substring(1).split("/")
    const elems = []
    let i = 0
    const pathParams = [...params]
    for (const part of parts) {
        elems.push(<div key={i + "_0"}>/</div>)
        if (part.startsWith(":")) {
            const param = pathParams.shift()
            elems.push(
                <div
                    className="px-2 border-b border-header-text/50"
                    key={i + "_1"}
                >
                    <div className="border-1 border-app-border text-xs">
                        <span className="opacity-50">{part.substring(1)}:</span>{" "}
                        {param}
                    </div>
                </div>
            )
        } else {
            elems.push(<div key={i + "_1"}>{part}</div>)
        }
        i++
    }
    return <div className="stack-h">{elems}</div>
}

export { RouteIndex, SimpleRoutePath }
