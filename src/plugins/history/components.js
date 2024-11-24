import { useMemo, useEffect, useContext } from "react"
import { useModalWindow } from "components/modal"
import { PluginRegistry } from "core/plugin"
import { Button } from "components/form"
import { AppContext } from "components/context"
import { Tabs, Tab } from "components/layout"
import { getPathParams, d } from "core/helper"
import { EntityIndex } from "core/entity"
import { EntityStack } from "components/common"
import { RoutePath } from "../routeSelector/components"
import { RenderWithAssignments } from "../../components/assignments"

function HistoryWidget({}) {
    const aContext = useContext(AppContext)
    const routePlugin = PluginRegistry.getActivePlugin("routeSelector")

    const elems = []
    for (const { request, assignments } of aContext.history) {
        if (elems.length > 10) break

        elems.push(
            <div key={elems.length} className="py-1 stack-h gap-x-2 w-full">
                <pre
                    className="auto cursor-pointer"
                    onClick={() =>
                        aContext.startContentStream(request, assignments)
                    }
                >
                    {request.method} {request.path}
                </pre>
                {routePlugin && (
                    <div>
                        <Button
                            icon="edit"
                            onPressed={() => {
                                const pathInfo = aContext.getMatchingRoutePath(
                                    request.path,
                                    request.method
                                )
                                if (pathInfo) {
                                    routePlugin.openEditor({
                                        request,
                                        assignments
                                    })
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="stack-v gap-1 text-left">
            <div className="text-app-bg bg-app-text/40 text-xs py-1 px-2">
                Your last requests:
            </div>
            <div className="divide-y divide-app-text/50 text-app-text/50 px-2">
                {elems}
            </div>
        </div>
    )
}

class HistoryIndex extends EntityIndex {
    constructor(model) {
        super()
        this.model = model
        this.items = model.map((item) => item.hash)
    }

    getEntityProps() {
        return [
            ...super.getEntityProps(),
            "timestamp",
            "request",
            "assignments"
        ]
    }

    getEntityPropValue(index, prop) {
        if (["timestamp", "request", "assignments"].includes(prop)) {
            return this.model[index][prop]
        }
        return super.getEntityPropValue(index, prop)
    }
}

function History({ close }) {
    const aContext = useContext(AppContext)
    const routePlugin = PluginRegistry.getActivePlugin("routeSelector")
    const historyIndex = useMemo(() => {
        return new HistoryIndex(aContext.history)
    }, [])
    const methods = []
    for (const { method } of historyIndex.getPropValues("request")) {
        if (!method || methods.includes(method)) continue

        methods.push(method)
    }
    const actionItems = [
        {
            icon: "edit",
            action: (index) => {
                const { request, assignments = {} } =
                    historyIndex.getEntityObject(index)
                const pathInfo = aContext.getMatchingRoutePath(
                    request.path,
                    request.method
                )
                if (pathInfo) {
                    routePlugin.openEditor({ request, assignments })
                }
                close()
            }
        },
        {
            icon: "east",
            action: (index) => {
                const { request, assignments } =
                    historyIndex.getEntityObject(index)
                aContext.startContentStream({ request, assignments })
                close()
            }
        },
        { icon: "delete", action: (index) => d(index) }
    ]
    const actions = [
        {
            name: "Delete",
            icon: "delete",
            op: {
                exec: () => d("xxx")
            }
        }
    ]

    return (
        <Tabs>
            {methods.map((method) => (
                <Tab key={method} name={method} active={method === methods[0]}>
                    <div className="p-4">
                        <EntityStack
                            entityIndex={historyIndex}
                            matcher={(index) =>
                                historyIndex.getEntityPropValue(
                                    index,
                                    "request"
                                ).method === method
                            }
                            actions={actions}
                            itemActions={actionItems}
                            render={({
                                timestamp,
                                request,
                                assignments,
                                hash
                            }) => {
                                const pathInfo = aContext.getMatchingRoutePath(
                                    request.path,
                                    request.method
                                )
                                const params = pathInfo
                                    ? getPathParams(pathInfo, request.path)
                                    : []
                                return (
                                    <RenderWithAssignments
                                        key={hash}
                                        mode={1}
                                        method={method}
                                        request={request}
                                        assignments={assignments}
                                        className="w-full"
                                    >
                                        <div className="w-full gap-2 stack-h">
                                            <div className="opacity-50">
                                                {method}
                                            </div>
                                            <div className="auto">
                                                {pathInfo && (
                                                    <RoutePath
                                                        path={pathInfo.path}
                                                        params={params}
                                                    />
                                                )}
                                                {!pathInfo && request.path}
                                            </div>
                                            <div className="opacity-50 text-xs">
                                                {new Date(
                                                    timestamp
                                                ).toLocaleDateString()}{" "}
                                                {new Date(
                                                    timestamp
                                                ).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </RenderWithAssignments>
                                )
                            }}
                        />
                    </div>
                </Tab>
            ))}
        </Tabs>
    )
}

function HistoryWindow({ plugin }) {
    const HistoryModal = useModalWindow()

    useEffect(() => {
        plugin.setButtonHandler("history", () => {
            HistoryModal.open({})
        })
    }, [])

    return (
        <>
            <HistoryModal.content name="History" width="70%" height="100%">
                <History {...HistoryModal.props} />
            </HistoryModal.content>
        </>
    )
}

export { HistoryWindow, HistoryWidget }
