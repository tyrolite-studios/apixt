import { useModalWindow } from "components/modal"
import { useContext, useEffect } from "react"
import { AppContext } from "components/context"
import { Div } from "components/layout"
import { Button, Input } from "components/form"
import { d } from "core/helper"

function RouteSelector({ close, plugin }) {
    const aContext = useContext(AppContext)
    const routes = aContext.config.routes
    const openRoute = (method, path) => {
        close()
        aContext.startContentStream({ path, method })
    }
    return (
        <div className="stack-v p-4 divide-y">
            {routes.map(({ path, methods }, i) =>
                methods.map((method, i) => (
                    <div key={i} className="stack-h w-full">
                        <Div
                            key={method + " " + path}
                            cursor="pointer"
                            className="auto p-2 hover:bg-header-bg/30"
                            onClick={() => openRoute(method, path)}
                        >
                            <pre>
                                {method} {path}
                            </pre>
                        </Div>
                        <Button
                            icon="edit"
                            onPressed={() =>
                                plugin.openEditor({ path, methods })
                            }
                        />
                    </div>
                ))
            )}
        </div>
    )
}

function RouteEditor({ methods, path, close }) {
    return (
        <div className="stack-v p-3">
            <div className="textxl">Edit Route</div>
            <div>
                <Input value={path} />
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
