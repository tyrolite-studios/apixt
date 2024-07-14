import { useState, useContext } from "react"
import { Button } from "./form"
import { AppContext } from "./context"
import { useModalWindow } from "./modal"
import { d } from "../core/helper"

function Test(props) {
    return (
        <div className="p-8 overflow-auto">
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
            Lorem ipsos
            <br />
        </div>
    )
}
function History({ openModal }) {
    return (
        <div className="p-8">
            History in the making...
            <Button onClick={openModal} name="Open nested..." />
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
                    <Button name="Builder..." onClick={TestWindow.open} />
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
