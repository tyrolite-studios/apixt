import { useEffect } from "react"
import { useModalWindow } from "components/modal"

function Profiler({ close }) {
    return (
        <div className="stack-v p-4">
            <div>Profiler...</div>
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
