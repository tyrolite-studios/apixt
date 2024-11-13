import { useMemo, useState } from "react"
import { useModalWindow } from "components/modal"
import { useContext, useEffect } from "react"
import { AppContext } from "components/context"
import { Input } from "components/form"
import { d, getPathInfo } from "core/helper"
import { Tabs, Tab, OkCancelLayout } from "components/layout"
import { EntityStack, HeaderStack, QueryStack } from "components/common"
import { FormGrid, InputCells, SelectCells, Textarea } from "components/form"
import { isMethodWithRequestBody } from "core/http"
import { CustomCells, TextareaCells } from "../../components/form"
import { HeadersIndex, QueryIndex } from "core/entity"

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

function RouteLauncher({
    path,
    method,
    params,
    close,
    query = {},
    headers = {},
    ...props
}) {
    const aContext = useContext(AppContext)
    const pathInfo = useMemo(() => {
        return getPathInfo(path)
    }, [])

    const headerIndex = useMemo(() => {
        return new HeadersIndex(headers)
    }, [])
    const queryIndex = useMemo(() => {
        return new QueryIndex(query)
    }, [])
    const [body, setBody] = useState(
        isMethodWithRequestBody(method) ? props.body ?? "" : undefined
    )
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
                for (const { fix, value, ref } of pathInfo.components) {
                    path += "/"
                    path += fix ? value : pathParams[ref]
                }
                let params = {}
                for (const {
                    fix,
                    queryValue,
                    value
                } of queryIndex.getEntityObjects()) {
                    params[value] = queryValue
                }
                const query = new URLSearchParams(params).toString()
                close()
                aContext.startContentStream({ method, path, query, body })
            }}
            cancel={() => close()}
        >
            <FormGrid>
                <CustomCells name="Path:">
                    <div className="stack-h gap-1">{routeElems}</div>
                </CustomCells>
                <CustomCells name="Query:">
                    <QueryStack queryIndex={queryIndex} />
                </CustomCells>
                <CustomCells name="Headers:">
                    <HeaderStack headerIndex={headerIndex} />
                </CustomCells>
                {body !== undefined && (
                    <TextareaCells name="Body:" value={body} set={setBody} />
                )}
            </FormGrid>
        </OkCancelLayout>
    )
}

function RouteStack({ close, routeIndex, method, plugin }) {
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
                const { path } = routeIndex.getEntityObject(index)
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
                const { path } = routeIndex.getEntityObject(index)
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
            matcher={(index) =>
                routeIndex.getEntityPropValue(index, "methods").includes(method)
            }
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

function RouteSelector({ close, plugin }) {
    const aContext = useContext(AppContext)
    const routeIndex = aContext.routeIndex
    const methods = useMemo(() => {
        return ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"].filter(
            (method) =>
                routeIndex.hasPropValueMatch("methods", (value) =>
                    value.includes(method)
                )
        )
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
            {methods.map((method) => (
                <Tab key={method} active={method === "GET"} name={method}>
                    <div className="p-4 overflow-auto">
                        <div className="stack-v gap-2">
                            <div>Headers</div>
                            <HeaderStack headerIndex={headerIndex} />
                            <div>Routes</div>
                            <RouteStack
                                plugin={plugin}
                                routeIndex={routeIndex}
                                method={method}
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

export { RoutesModal, RoutePath }
