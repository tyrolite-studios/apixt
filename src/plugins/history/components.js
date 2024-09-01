import { useEffect, useState, useMemo } from "react"
import { useModalWindow } from "components/modal"
import { PluginRegistry } from "core/plugin"
import { Button } from "components/form"

import controller from "../../core/controller"
import configFile from "../../dev/config"

function HistoryWidget({}) {
    const routePlugin = PluginRegistry.getActivePlugin("routeSelector")

    return (
        <div className="stack-v gap-1 text-left">
            <div className="text-app-bg bg-app-text/40 text-xs py-1 px-2">
                Your last requests:
            </div>
            <div className="divide-y divide-app-text/50 text-app-text/50 px-2">
                <div className="py-1 stack-h gap-x-2 w-full">
                    <pre className="auto">GET /music/data/filter</pre>
                    {routePlugin && (
                        <div>
                            <Button
                                icon="edit"
                                onPressed={() =>
                                    routePlugin.openEditor({
                                        route: "/music/data/filter"
                                    })
                                }
                            />
                        </div>
                    )}
                </div>
                <div className="py-1 stack-h gap-x-2 w-full">
                    <pre className="auto">GET /music.it/filter/genre</pre>
                    {routePlugin && (
                        <div>
                            <Button
                                icon="edit"
                                onPressed={() =>
                                    routePlugin.openEditor({
                                        route: "/music.it/filter/genre"
                                    })
                                }
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const matchDynamicRoute = (request, route) => {
    // Escape special characters in the pattern except for *
    let regexPattern = route.replace(/[-\/\\^$+?.()|[\]{}]/g, "\\$&")

    // Replace * with the regex pattern to match any characters (including none)
    regexPattern = regexPattern.replace(/\*/g, ".*")

    // Create the regular expression with start ^ and end $ anchors
    const regex = new RegExp(`^${regexPattern}$`)

    // Test the route against the generated regex
    return regex.test(request)
}

function History({ close }) {
    /*
    const localStorage = controller.localStorage
    const lastRequests = localStorage.get("requests")

    const { jwt, config } = configFile
    const routes = config.routes
    */
    const [routeSearch, setRouteSearch] = useState("")
    const routePlugin = PluginRegistry.getActivePlugin("routeSelector")
    const routeSelectorActive = routePlugin.active

    const exampleRoutes = [
        { method: "POST", route: "/v1/*/*/json" },
        { method: "GET", route: "/admin/cacheclear" },
        { method: "GET", route: "/admin/*" }
    ]

    const exampleLastRequests = [
        { method: "POST", route: "/v1/data/foo/json" },
        { method: "POST", route: "/v1/data/bar/json" },
        { method: "POST", route: "/other/bla" },
        { method: "GET", route: "blah" },
        { method: "GET", route: "bla" },
        { method: "GET", route: "/admin/cacheclear" },
        { method: "POST", route: "/v1/data/f/json" },
        { method: "POST", route: "/v1/da/bs/json" },
        { method: "POST", route: "/other/sbla" },
        { method: "GET", route: "blahss" },
        { method: "GET", route: "blas" },
        { method: "GET", route: "blas/json" }
    ]

    const [filteredRequests, setFilteredRequests] =
        useState(exampleLastRequests)

    const groupedRequests = useMemo(() => {
        const tmpRequests = []
        const foundRequests = []
        for (const { method, route } of exampleRoutes) {
            if (!(method in tmpRequests)) tmpRequests[method] = {}
            tmpRequests[method][route] = {}
            const exactMatchIndex = filteredRequests.findIndex(
                (request) =>
                    request.method === method && request.route === route
            )
            if (exactMatchIndex !== -1) {
                tmpRequests[method][route] = {
                    requests: [filteredRequests[exactMatchIndex].route]
                }
                foundRequests.push(filteredRequests[exactMatchIndex].route)
                continue
            }
            const dynamicRoutes = filteredRequests
                .filter((request) => matchDynamicRoute(request.route, route))
                .map((request) => request.route)
            if (dynamicRoutes.length > 0) {
                tmpRequests[method][route] = {
                    requests: dynamicRoutes
                }
                foundRequests.push(...dynamicRoutes)
                continue
            }
            tmpRequests[method][route] = {
                requests: []
            }
        }
        const others = filteredRequests.filter(
            (request) => !foundRequests.includes(request.route)
        )
        for (const other of others) {
            if ("" in tmpRequests[other.method])
                tmpRequests[other.method][""].requests.push(other.route)
            else
                tmpRequests[other.method][""] = {
                    requests: [other.route]
                }
        }
        return tmpRequests
    }, [filteredRequests])

    return (
        <div className="stack-v p-4">
            <input
                defaultValue={routeSearch}
                onChange={(e) =>
                    setFilteredRequests(
                        exampleLastRequests.filter((req) =>
                            req.route.includes(e.target.value)
                        )
                    )
                }
            />
            <div>
                {Object.keys(groupedRequests).map((method) => (
                    <div key={method}>
                        {Object.keys(groupedRequests[method]).map((route) => (
                            <div key={route}>
                                {method} {route === "" ? "" : route}
                                <div>
                                    {groupedRequests[method][route].requests
                                        .filter((request) =>
                                            request.includes(routeSearch)
                                        )
                                        .map((request, index) => (
                                            <div key={index}>
                                                - {request}
                                                {routeSelectorActive && (
                                                    <Button
                                                        icon="build"
                                                        onPressed={() =>
                                                            routePlugin.openEditor(
                                                                {
                                                                    route: request
                                                                }
                                                            )
                                                        }
                                                    />
                                                )}
                                                <Button icon="delete" />
                                            </div>
                                        ))}
                                </div>
                                <br />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
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
                <History />
            </HistoryModal.content>
        </>
    )
}

export { HistoryWindow, HistoryWidget }
