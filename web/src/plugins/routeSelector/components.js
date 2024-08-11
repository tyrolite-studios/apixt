import { useModalWindow } from "components/modal"
import { useContext, useEffect } from "react"
import { AppContext } from "components/context"
import { Div } from "components/layout"
import { Button, Input } from "components/form"
import { d } from "core/helper"

function RouteSelector({ close, plugin }) {
    const aCtx = useContext(AppContext)
    const routes = aCtx.config.routes
    const openRoute = (path) => {
        close()
        aCtx.startContentStream({ path, method: "GET" })
    }
    return (
        <div className="stack-v p-4 divide-y">
            {routes.map((route, i) => (
                <div key={i} className="stack-h w-full">
                    <Div
                        key={route}
                        cursor="pointer"
                        className="auto p-2 hover:bg-header-bg/30"
                        onClick={() => openRoute(route)}
                    >
                        <pre>GET {route}</pre>
                    </Div>
                    <Button
                        icon="edit"
                        onClick={() => plugin.openEditor({ route })}
                    />
                </div>
            ))}
        </div>
    )
}

function RouteEditor({ route, close }) {
    return (
        <div className="stack-v p-3">
            <div className="textxl">Edit Route</div>
            <div>
                <Input value={route} />
            </div>
        </div>
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
            <RoutesWindow.content name="Select Route">
                <RouteSelector plugin={plugin} {...RoutesWindow.props} />
            </RoutesWindow.content>

            <EditorWindow.content name="Edit Route">
                <RouteEditor {...EditorWindow.props} />
            </EditorWindow.content>
        </>
    )
}

export { RoutesModal }
