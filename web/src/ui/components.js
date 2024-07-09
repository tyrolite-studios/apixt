import { RequestBuilder } from './components/RequestBuilder'

function MainLayout() {
    return (
        <div className="h-full w-full flex-col bg-slate-700 flex space-x-1">
            <div className="text-white p-3">Title Bar...</div>
            <div className="text-xl  p-10 text-center bg-white text-black flex-auto">
                API Extender
                <RequestBuilder/>
            </div>
        </div>
    )
}

export { MainLayout }
