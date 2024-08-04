import { useContext } from "react"
import { AppContext } from "./context"
import { Div } from "./layout"

function RouteSelector({ close }) {
    const aCtx = useContext(AppContext)

    const routes = aCtx.config.routes

    const openRoute = (path) => {
        close()
        aCtx.startContentStream({ path, method: "GET" })
    }

    return (
        <div className="stack-v p-4 divide-y">
            {routes.map((route) => (
                <Div
                    key={route}
                    cursor="pointer"
                    className="p-2 hover:bg-header-bg/30"
                    onClick={() => openRoute(route)}
                >
                    <pre>GET {route}</pre>
                </Div>
            ))}
        </div>
    )
}

export { RouteSelector }
