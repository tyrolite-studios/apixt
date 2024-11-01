import { useMemo, useState } from "react"
import { useModalWindow } from "components/modal"
import { useContext, useEffect } from "react"
import { AppContext } from "components/context"
import { Input } from "components/form"
import { d, getPathInfo } from "core/helper"
import { Tabs, Tab, OkCancelLayout } from "components/layout"
import { EntityIndex } from "core/entity"
import { EntityStack } from "components/common"
import { Form, FormGrid, InputCells, SelectCells } from "components/form"

class RouteIndex extends EntityIndex {
    constructor(routes, method) {
        super()
        this.model = routes
        this.method = method
        this.items = routes.map((route) => route.path)
    }

    getEntityProps() {
        return [...super.getEntityProps(), "path", "method", "methods"]
    }

    getEntityValue(index) {
        return this.items[index].path
    }

    getEntityPropValue(index, prop) {
        if (prop === "path") {
            return this.model[index].path
        }
        if (prop === "methods") return this.model[index].methods
        if (prop === "method") return this.method
        return super.getEntityPropValue(index, prop)
    }
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

function RouteLauncher({ path, method, body, params, close }) {
    const aContext = useContext(AppContext)
    const pathInfo = useMemo(() => {
        return getPathInfo(path)
    }, [])

    const [pathParams, setPathParams] = useState(() => {
        const { varCount } = pathInfo
        if (!varCount) return []
        if (params) return [...params]
        const arr = []
        while (arr.length < varCount) arr.push("")
        return arr
    })

    const routeElems = []
    let i = -1
    for (const { fix, value, ref } of pathInfo.components) {
        i++
        routeElems.push(<div key={i + "_0"}>/</div>)
        if (fix) {
            routeElems.push(<div key={i + "_1"}>{value}</div>)
            continue
        }
        routeElems.push(
            <div key={i + "_2"} className="stack-h gap-1">
                <div className="opacity-50 text-xs">{value}:</div>
                <Input
                    autoFocus={ref === 0}
                    required
                    value={pathParams[ref]}
                    set={(value) => {
                        const newParams = [...pathParams]
                        newParams[ref] = value
                        setPathParams(newParams)
                    }}
                />
            </div>
        )
    }
    return (
        <OkCancelLayout
            ok={() => {
                let path = ""
                for (const { fix, value, ref } of d(pathInfo.components)) {
                    path += "/"
                    path += fix ? value : pathParams[ref]
                }
                close()
                aContext.startContentStream({ method, path })
            }}
            cancel={() => close()}
        >
            <div className="stack-h gap-1 p-4">{routeElems}</div>
        </OkCancelLayout>
    )
}

function RouteStack({ close, routeIndex, plugin }) {
    const aContext = useContext(AppContext)
    const index2lastParams = useMemo(() => {
        const result = {}
        for (const { index, path } of routeIndex.getEntityObjects()) {
            result[index] = aContext.getLastPathParams(path)
        }
        return result
    }, [])
    const actions = [
        {
            icon: "edit",
            action: (index) => {
                close()
                const { path, method } = routeIndex.getEntityObject(index)
                plugin.openEditor({
                    path,
                    method,
                    params: index2lastParams[index]
                })
            }
        },
        {
            icon: "east",
            action: (index) => {
                close()
                const { path, method } = routeIndex.getEntityObject(index)
                const pathInfo = getPathInfo(path)
                if (pathInfo.varCount === 0) {
                    aContext.startContentStream({ path, method })
                    return
                }
                const params = index2lastParams[index]
                if (pathInfo.varCount > params.length) {
                    plugin.openEditor({
                        path,
                        method
                    })
                    return
                }
                let resolvedPath = ""
                for (const { fix, value, ref } of pathInfo.components) {
                    if (fix) {
                        resolvedPath += `/${value}`
                    } else {
                        resolvedPath += `/${params[ref]}`
                    }
                }
                aContext.startContentStream({ path: resolvedPath, method })
            }
        }
    ]

    return (
        <EntityStack
            entityIndex={routeIndex}
            itemActions={actions}
            render={(item) => (
                <div className="stack-v">
                    <RoutePath
                        path={item.path}
                        params={index2lastParams[item.index]}
                    />
                    <div className="text-xs opacity-50">
                        {item.methods.join(", ")}
                    </div>
                </div>
            )}
        />
    )
}

function HeaderEditForm({ model, close, store, edit }) {
    const [value, setValue] = useState(model.value)
    const [type, setType] = useState(model.type)
    const [headerValue, setHeaderValue] = useState(model.headerValue)
    const typeOptions = [{ id: "fix", name: "Constant" }]
    return (
        <OkCancelLayout
            ok={() => {
                store({ value, type, headerValue })
            }}
            cancel={() => close()}
        >
            <FormGrid>
                <InputCells
                    name="Name"
                    value={value}
                    set={setValue}
                    autoFocus={!edit}
                    required
                />
                <SelectCells
                    name="Type"
                    value={type}
                    set={setType}
                    options={typeOptions}
                />
                <InputCells
                    name="Value"
                    value={headerValue}
                    set={setHeaderValue}
                    required
                    autoFocus={edit}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function HeaderStack({ headerIndex }) {
    const EditModal = useModalWindow()

    const actions = [
        {
            icon: "add",
            name: "New",
            op: {
                exec: () => {
                    EditModal.open({
                        model: {
                            name: "",
                            type: "fix",
                            headerValue: ""
                        },
                        store: (newModel) => {
                            headerIndex.setEntityObject(newModel)
                            EditModal.close()
                        }
                    })
                }
            }
        }
    ]

    const itemActions = [
        {
            icon: "edit",
            action: (index) => {
                const model = headerIndex.getEntityObject(index)
                EditModal.open({
                    model,
                    edit: true,
                    store: (newModel) => {
                        headerIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        EditModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => {
                headerIndex.deleteEntity(index)
            }
        }
    ]
    return (
        <>
            <EntityStack
                entityIndex={headerIndex}
                actions={actions}
                itemActions={itemActions}
                render={(item) => (
                    <div className="stack-v">
                        <div className="text-xs opacity-50">{item.value}:</div>
                        <pre>{item.headerValue}</pre>
                    </div>
                )}
            />

            <EditModal.content>
                <HeaderEditForm {...EditModal.props} />
            </EditModal.content>
        </>
    )
}

function RouteSelector({ close, plugin }) {
    const aContext = useContext(AppContext)
    const method2routes = useMemo(() => {
        const result = {}
        for (const routeConfig of aContext.config.routes) {
            for (const method of routeConfig.methods) {
                if (!result[method]) result[method] = []
                result[method].push(routeConfig)
            }
        }
        return result
    }, [])

    const method2routeIndex = useMemo(() => {
        const result = {}
        for (const [method, routes] of Object.entries(method2routes)) {
            result[method] = new RouteIndex(routes, method)
        }
        return result
    }, [])

    const headerIndex = aContext.getBaseHeaderIndex()

    useEffect(() => {
        const listener = () => {
            aContext.apiStorage.setJson("baseHeaders", headerIndex.model)
        }
        headerIndex.addListener(listener)
        return () => {
            headerIndex.removeListener(listener)
        }
    }, [])

    return (
        <Tabs persistId="routeSelector">
            {Object.entries(method2routes).map(([method, routes]) => (
                <Tab key={method} active={method === "GET"} name={method}>
                    <div className="p-4 overflow-auto">
                        <div className="stack-v gap-2">
                            <div>Headers</div>
                            <HeaderStack headerIndex={headerIndex} />
                            <div>Routes</div>
                            <RouteStack
                                plugin={plugin}
                                routeIndex={method2routeIndex[method]}
                                close={close}
                            />
                        </div>
                    </div>
                </Tab>
            ))}
        </Tabs>
    )
}

function RoutesModal({ plugin }) {
    const RoutesWindow = useModalWindow()
    const EditorWindow = useModalWindow()
    const openEditor = (props) => EditorWindow.open(props)

    useEffect(() => {
        plugin.setButtonHandler("selector", () => {
            RoutesWindow.open({})
        })

        plugin.setOpenEditor(openEditor)
    }, [])

    return (
        <>
            <RoutesWindow.content name="Select Route" width="600px">
                <RouteSelector plugin={plugin} {...RoutesWindow.props} />
            </RoutesWindow.content>

            <EditorWindow.content name="Edit Route">
                <RouteLauncher {...EditorWindow.props} />
            </EditorWindow.content>
        </>
    )
}

export { RoutesModal }
