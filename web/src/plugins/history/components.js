import { useEffect } from "react"
import { useModalWindow } from "../../components/modal"
import { PluginRegistry } from "../../core/plugin"
import { Button } from "../../components/form"

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
                                onClick={() =>
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
                                onClick={() =>
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

function History({ close }) {
    return (
        <div className="stack-v p-4">
            <div>History entries come here...</div>
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
