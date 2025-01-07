import { useState, useMemo } from "react"
import { EntityIndex } from "core/entity"
import { APIS } from "./apis"
import { OkCancelLayout } from "components/layout"
import { FormGrid, InputCells } from "components/form"
import { useModalWindow } from "components/modal"
import { getPathParams, getResolvedPath } from "core/http"
import { d } from "core/helper"

class RouteIndex extends EntityIndex {
    constructor(routes) {
        super()
        this.model = routes
        this.items = routes.map((route) => route.path)
        this.filterProps = ["path"]
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

function RouteParamsCells({ pathInfo, pathParams, setPathParams }) {
    const routeInputCells = []
    for (const { fix, value, ref } of pathInfo.components) {
        if (fix) continue

        routeInputCells.push(
            <InputCells
                key={value}
                name={`${value}:`}
                autoFocus={ref === 0}
                value={pathParams[ref]}
                set={(newValue) => {
                    const newParams = [...pathParams]
                    newParams[ref] = newValue
                    setPathParams(newParams)
                }}
            />
        )
    }

    return <>{routeInputCells}</>
}

function RouteParamsWindow({ close, save, pathInfo, path }) {
    const params = useMemo(() => {
        return pathInfo ? getPathParams(pathInfo, path) : []
    }, [])
    const [pathParams, setPathParams] = useState(() => {
        const { varCount } = pathInfo
        if (!varCount) return []
        if (params) return [...params]
        const arr = []
        while (arr.length < varCount) arr.push("")
        return arr
    })
    const formParams = { pathParams, setPathParams, pathInfo }
    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() => {
                const [, query] = path.split("?")
                save(
                    getResolvedPath(pathInfo.path, pathParams) +
                        (query ? "?" + query : "")
                )
            }}
        >
            <FormGrid>
                <RouteParamsCells {...formParams} />
            </FormGrid>
        </OkCancelLayout>
    )
}

function useRouteParamsModal({ save, ...props }) {
    const RouteParamsModal = useModalWindow()

    return {
        openRouteParamsModal: () => {
            RouteParamsModal.open({
                ...props,
                save: (model) => {
                    save(model)
                    RouteParamsModal.close()
                }
            })
        },
        RouteParamsModal: (
            <RouteParamsModal.content>
                <RouteParamsWindow {...RouteParamsModal.props} />
            </RouteParamsModal.content>
        )
    }
}

export { RouteIndex, SimpleRoutePath, RoutePath, useRouteParamsModal }
