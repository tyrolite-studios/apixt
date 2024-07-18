import { useState, useContext } from "react"
import { Button } from "./form"
import { AppContext } from "./context"
import { useModalWindow } from "./modal"
import { d } from "../core/helper"
import { AutoCompleteInput, headerContentTypes } from "../util"

function Test(props) {
    return (
        <AutoCompleteInput
            recommendations={headerContentTypes}
            emptyValue="<Enter Value>"
        />
    )
}
function History({ openModal, close }) {
    return (
        <div className="p-8">
            History in the making...
            <Button onClick={() => openModal()} name="Open nested..." />
            <Button onClick={() => close()} name="Close" />
            <Button
                onClick={() => {
                    close()
                    openModal()
                }}
                name="Close and open..."
            />
        </div>
    )
}

function Header() {
    const aCtx = useContext(AppContext)

    const TestWindow = useModalWindow()
    const HistoryWindow = useModalWindow()

    const [lastCol, setLastCol] = useState("255, 255, 255")
    const [lastBg, setLastBg] = useState("0, 0, 0")

    const switchTheme = () => {
        const oldBg = document.body.style.getPropertyValue("--app-bg")
        const oldCol = document.body.style.getPropertyValue("--app")
        document.body.style.setProperty("--app-bg", lastBg)
        document.body.style.setProperty("--app", lastCol)
        setLastBg(oldBg)
        setLastCol(oldCol)
    }
    return (
        <>
            <div className="stack-h text-sm px-2 py-1 space-x-2 w-full text-header bg-header-bg">
                <div className="space-x-2">
                    <Button
                        name="Builder..."
                        onClick={() => TestWindow.open()}
                    />
                    <Button
                        name="History..."
                        onClick={() =>
                            HistoryWindow.open({ openModal: TestWindow.open })
                        }
                    />
                </div>

                <div className="auto" />

                <div className="">
                    <Button name="Switch Theme" onClick={switchTheme} />
                </div>
            </div>

            <TestWindow.content name="Test modal" width="500px" height="400px">
                <Test {...TestWindow.props} />
            </TestWindow.content>

            <HistoryWindow.content name="History" className="w-full">
                <History {...HistoryWindow.props} />
            </HistoryWindow.content>
        </>
    )
}

export { Header }