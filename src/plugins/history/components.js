import { useEffect, useContext } from "react"
import { useModalWindow } from "components/modal"
import { PluginRegistry } from "core/plugin"
import { Button } from "components/form"
import { FocusMatrix } from "components/common"
import { AppContext } from "components/context"
import { d } from "core/helper"

function HistoryWidget({}) {
    const aContext = useContext(AppContext)
    const routePlugin = PluginRegistry.getActivePlugin("routeSelector")

    d(aContext.history)
    const elems = []
    for (const { request } of aContext.history) {
        if (elems.length > 10) break

        elems.push(
            <div key={elems.length} className="py-1 stack-h gap-x-2 w-full">
                <pre
                    className="auto cursor-pointer"
                    onClick={() => aContext.startContentStream(request)}
                >
                    {request.method} {request.path}
                </pre>
                {routePlugin && (
                    <div>
                        <Button
                            icon="edit"
                            onPressed={() =>
                                routePlugin.openEditor({
                                    route: request.path
                                })
                            }
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
    return (
        <div className="stack-v p-4">
            <FocusMatrix />
            <Button name="OK" />
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
