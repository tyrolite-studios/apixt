import { useEffect, useState } from "react"
import { useModalWindow } from "components/modal"
import { Select, Input, Button } from "components/form"
import configFile from "../../dev/config"

function Profiler({ close }) {
    /*
        const { jwt, config } = configFile
        const routes = config.routes
    */
    const routes = ["route1", "route2", "route3"]

    const [routeSelected, setRouteSelected] = useState(false)
    const [selectedRoute, setSelectedRoute] = useState(undefined)

    const options = routes.reduce((obj, el) => {
        obj[el] = el
        return obj
    }, {})

    const handleRouteChange = (route) => {
        setRouteSelected(true)
        setSelectedRoute(route)
    }

    const profiling = () => {
        //Fire amount of Parallel Requests

        //Fire amount of Requests with timeout of pause

        //Collect Execution times and response codes
        const results = [
            { responseCode: 200, executionTime: 13.4 },
            { responseCode: 200, executionTime: 1.4 },
            { responseCode: 200, executionTime: 7.2 },
            { responseCode: 200, executionTime: 5.8 },
            { responseCode: 200, executionTime: 10.3 }
        ]

        const successRequests = results.filter(
            (res) => res.responseCode === 200
        )

        const totalExecutiontime = successRequests.reduce(
            (sum, el) => sum + el.executionTime,
            0
        )
        const averageExecutiontime = totalExecutiontime / successRequests.length
    }

    const selectProps = {
        options,
        defaultValue: routes[0],
        onSelect: handleRouteChange
    }

    return (
        <div className="stack-v p-4">
            <h1>Route Profiling</h1>
            <div>Select Route: </div>
            <Select {...selectProps} />
            {routeSelected && (
                <div>
                    <div>
                        <span>Number of Requests: </span>
                        <Input />
                    </div>
                    <div>
                        <span>Number of Parallel Requests: </span>
                        <Input />
                    </div>
                    <div>
                        <span>Pause in seconds: </span>
                        <Input />
                    </div>
                    <div>
                        <Button
                            name="Start Profiling"
                            className="not_py-0 not_px-2 py-2 px-4"
                            onPressed={profiling}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function ProfilerWindow({ plugin }) {
    const ProfilerModal = useModalWindow()

    useEffect(() => {
        plugin.setButtonHandler("routeProfiler", () => {
            ProfilerModal.open({})
        })
    }, [])

    return (
        <>
            <ProfilerModal.content name="Profiler" width="70%" height="100%">
                <Profiler />
            </ProfilerModal.content>
        </>
    )
}

export { ProfilerWindow }
