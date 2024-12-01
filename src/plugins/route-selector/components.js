import { useMemo, useState, useContext, useEffect } from "react"
import { useModalWindow } from "components/modal"
import { AppContext } from "components/context"
import { Input, Textarea } from "components/form"
import { d, getPathInfo, getResolvedPath, getPathParams } from "core/helper"
import { Tabs, Tab, OkCancelLayout } from "components/layout"
import { EntityStack } from "components/common"
import { FormGrid, Radio } from "components/form"
import { isMethodWithRequestBody } from "core/http"
import { CustomCells } from "components/form"
import {
    RenderWithAssignments,
    AssignmentStack,
    AssignmentIndex
} from "entities/assignments"

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

function getDefaultedAssignments(assignments, defaults) {
    for (const key of Object.keys(defaults)) {
        if (assignments[key] !== undefined) continue

        assignments[key] = {
            type: "default",
            value: ""
        }
    }
    return assignments
}

function RouteLauncher({ close, request, assignments = {} }) {
    const aContext = useContext(AppContext)

    const { method } = request
    const pathInfo = useMemo(() => {
        return aContext.getMatchingRoutePath(request.path, method)
    }, [])
    const params = useMemo(() => {
        return pathInfo ? getPathParams(pathInfo, request.path) : []
    })
    const supportsBody = isMethodWithRequestBody(method)
    const [body, setBody] = useState(
        supportsBody ? request.body ?? "" : undefined
    )
    const defaults = useMemo(() => {
        // TODO get from defaults associated with the pathMatch
        return {
            headers: pathInfo ? aContext.getBaseHeaderIndex().model : {},
            query: {},
            body: {}
        }
    }, [])

    const queryAssignmentIndex = useMemo(() => {
        return new AssignmentIndex(
            getDefaultedAssignments(assignments.query ?? {}, defaults.query)
        )
    }, [])
    const headersAssignmentIndex = useMemo(() => {
        return new AssignmentIndex(
            getDefaultedAssignments(assignments.headers ?? {}, defaults.headers)
        )
    }, [])
    const bodyAssignmentIndex = useMemo(() => {
        return new AssignmentIndex(assignments.body ?? {})
    }, [])

    const [pathParams, setPathParams] = useState(() => {
        const { varCount } = pathInfo
        if (!varCount) return []
        if (params) return [...params]
        const arr = []
        while (arr.length < varCount) arr.push("")
        return arr
    })

    let i = -1
    const routeElems = []
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

    const launch = () => {
        let path = ""
        for (const { fix, value, ref } of pathInfo.components) {
            path += "/"
            path += fix ? value : pathParams[ref]
        }
        close()
        aContext.startContentStream(
            { method, path, body },
            {
                query: queryAssignmentIndex.model,
                headers: headersAssignmentIndex.model,
                body: supportsBody ? bodyAssignmentIndex.model : undefined
            }
        )
    }

    return (
        <OkCancelLayout cancel={close} ok={launch}>
            <FormGrid>
                <CustomCells name="Path:">
                    <div className="stack-h gap-1">{routeElems}</div>
                </CustomCells>
                <CustomCells name="Query:">
                    <AssignmentStack
                        assignmentIndex={queryAssignmentIndex}
                        defaultsModel={defaults.query}
                    />
                </CustomCells>
                <CustomCells name="Headers:">
                    <AssignmentStack
                        assignmentIndex={headersAssignmentIndex}
                        defaultsModel={defaults.headers}
                    />
                </CustomCells>
                {body !== undefined && (
                    <CustomCells name="Body:">
                        <div className="stack-v">
                            <Textarea value={body} set={setBody} />
                            <div className="text-xs py-2">
                                Auto-Assignments:
                            </div>
                            <AssignmentStack
                                assignmentIndex={bodyAssignmentIndex}
                                defaultsModel={defaults.body}
                            />
                        </div>
                    </CustomCells>
                )}
            </FormGrid>
        </OkCancelLayout>
    )
}

function RouteStack({ close, routeIndex, method, plugin, mode }) {
    const aContext = useContext(AppContext)
    const index2lastParams = useMemo(() => {
        const result = {}
        for (const { index, path } of routeIndex.getEntityObjects()) {
            result[index] = aContext.getLastPathParams(path)
        }
        return result
    }, [])
    const index2lastRouteMatch = useMemo(() => {
        const result = {}
        for (const { index, path } of routeIndex.getEntityObjects()) {
            result[index] = aContext.getLastRouteMatch(
                method,
                getPathInfo(path)
            )
        }
        return result
    }, [])
    const actions = [
        {
            icon: "edit",
            action: (index) => {
                close()
                const match = index2lastRouteMatch[index]
                const { assignments = {}, request = {} } = match ?? {}
                const { path } = routeIndex.getEntityObject(index)
                plugin.openEditor({
                    request: {
                        path: getResolvedPath(path, index2lastParams[index]),
                        method,
                        body: request.body ?? ""
                    },
                    assignments
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
                    const pathParams = []
                    while (pathParams.length < pathInfo.count)
                        pathParams.push("")
                    plugin.openEditor({
                        request: {
                            path: getResolvedPath(path, pathParams),
                            method,
                            body: "{}"
                        },
                        assignments: {
                            query: {},
                            headers: {},
                            body: {}
                        }
                    })
                    return
                }
                const last = aContext.getLastRouteMatch(method, pathInfo)
                if (last) {
                    aContext.startContentStream(last.request, last.assignments)
                    return
                }
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
            render={(item) => {
                const match = index2lastRouteMatch[item.index] ?? {}
                const { assignments = {}, request = {} } = match

                return (
                    <RenderWithAssignments
                        assignments={assignments}
                        mode={mode}
                        method={method}
                        request={request}
                    >
                        <div key="i1" className="stack-v">
                            <RoutePath
                                path={item.path}
                                params={
                                    mode === 0
                                        ? []
                                        : index2lastParams[item.index]
                                }
                            />
                            <div className="text-xs opacity-50">
                                {item.methods.join(", ")}
                            </div>
                        </div>
                    </RenderWithAssignments>
                )
            }}
        />
    )
}

function RouteSelector({ close, plugin }) {
    const aContext = useContext(AppContext)
    const routeIndex = aContext.routeIndex
    const [mode, setModeRaw] = useState(plugin.getSetting("detailed") ? 1 : 0)
    const setMode = (mode) => {
        plugin.updateSetting("detailed", mode === 1)
        setModeRaw(mode)
    }
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

    const modeOptions = [
        { id: 0, name: "compact" },
        { id: 1, name: "detailed" }
    ]
    return (
        <Tabs persistId="routeSelector">
            {methods.map((method) => (
                <Tab key={method} active={method === "GET"} name={method}>
                    <div className="p-4 overflow-auto">
                        <div className="stack-v gap-2">
                            <div className="stack-h h-full">
                                <div className="auto" />
                                <Radio
                                    options={modeOptions}
                                    value={mode}
                                    set={setMode}
                                    gapped={false}
                                />
                            </div>
                            <div>Headers</div>
                            <AssignmentStack
                                mode={mode}
                                assignmentIndex={headerIndex}
                            />
                            <div>Routes</div>
                            <RouteStack
                                mode={mode}
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
