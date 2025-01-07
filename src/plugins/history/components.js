import { useEffect, useContext } from "react"
import { useModalWindow } from "components/modal"
import { PluginRegistry } from "core/plugin"
import { Button } from "components/form"
import { AppContext } from "components/context"
import { Tabs, Tab } from "components/layout"
import { formatDate, d } from "core/helper"
import { getPathParams } from "core/http"
import { EntityStack } from "components/common"
import { RoutePath } from "plugins/route-selector/components"
import { RenderWithAssignments } from "entities/assignments"

function HistoryWidget({}) {
    const aContext = useContext(AppContext)
    const routePlugin = PluginRegistry.getActivePlugin("routeSelector")

    const elems = []
    for (const {
        request,
        assignments
    } of aContext.historyEntryIndex.getEntityObjects()) {
        if (elems.length > 10) break

        elems.push(
            <div key={elems.length} className="py-1 stack-h gap-x-2 xw-full">
                <div
                    className="auto cursor-pointer truncate"
                    onClick={() =>
                        aContext.startContentStream(request, assignments)
                    }
                >
                    {request.method} {request.path}
                </div>
                {routePlugin && (
                    <div>
                        <Button
                            icon="edit"
                            onPressed={() => {
                                const pathInfo = aContext.getMatchingRoutePath(
                                    request.api,
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

function History({ close }) {
    const aContext = useContext(AppContext)
    const routePlugin = PluginRegistry.getActivePlugin("routeSelector")
    const requestPlugin = PluginRegistry.getActivePlugin("requestBuilder")
    const historyEntryIndex = aContext.historyEntryIndex
    const methods = []
    for (const { method } of historyEntryIndex.getPropValues("request")) {
        if (!method || methods.includes(method)) continue

        methods.push(method)
    }
    const actionItems = [
        {
            icon: "edit",
            action: (index) => {
                const { request, assignments = {} } =
                    historyEntryIndex.getEntityObject(index)
                const pathInfo = aContext.getMatchingRoutePath(
                    request.api,
                    request.path,
                    request.method
                )
                if (pathInfo) {
                    routePlugin.openEditor({ request, assignments })
                } else {
                    requestPlugin.openEditor({ request, assignments })
                }
                close()
            }
        },
        {
            icon: "east",
            action: (index) => {
                const { request, assignments } =
                    historyEntryIndex.getEntityObject(index)
                aContext.startContentStream(request, assignments)
                close()
            }
        },
        {
            icon: "delete",
            action: (index) => historyEntryIndex.deleteEntity(index)
        }
    ]
    const actions = [
        {
            name: "Delete",
            icon: "delete",
            op: {
                exec: (selected, setSelected) => {
                    historyEntryIndex.deleteEntities(selected)
                    setSelected([])
                },
                can: (selected) => selected.length > 0
            }
        }
    ]

    return (
        <Tabs>
            {methods.map((method) => (
                <Tab key={method} name={method} active={method === methods[0]}>
                    <div className="p-4">
                        <EntityStack
                            entityIndex={historyEntryIndex}
                            matcher={(index) =>
                                historyEntryIndex.getEntityPropValue(
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
                                bodyType,
                                value
                            }) => {
                                const pathInfo = aContext.getMatchingRoutePath(
                                    request.api,
                                    request.path,
                                    request.method
                                )
                                const params = pathInfo
                                    ? getPathParams(pathInfo, request.path)
                                    : []
                                return (
                                    <RenderWithAssignments
                                        key={value}
                                        mode={1}
                                        method={method}
                                        request={request}
                                        bodyType={bodyType}
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
                                                {formatDate(timestamp)}
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
