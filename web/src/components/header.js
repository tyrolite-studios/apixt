import { useState, useContext } from "react"
import { Button } from "./form"
import { AppContext } from "./context"
import { useModal } from "./modal"

function TestModalComponent(props) {
    console.log(props)
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

function HistoryModalComponent({ openModal }) {
    const InnerModal = useModal()
    return (
        <div className="p-8">
            History in the making...
            <Button onClick={openModal} name="Open Inner..." />
        </div>
    )
}

function Header() {
    const aCtx = useContext(AppContext)

    const TestModal = useModal()
    const HistoryModal = useModal()

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
                    <Button name="Builder..." onClick={TestModal.open} />
                    <Button
                        name="History..."
                        onClick={() =>
                            HistoryModal.open({ openModal: TestModal.open })
                        }
                    />
                </div>

                <div className="auto" />

                <div className="">
                    <Button name="Switch Theme" onClick={switchTheme} />
                </div>
            </div>
            <TestModal.content
                name="Here is my first modal!"
                width="500px"
                height="400px"
            >
                <TestModalComponent {...TestModal.props} />
            </TestModal.content>

            <HistoryModal.content name="History" className="w-full">
                <HistoryModalComponent {...HistoryModal.props} />
            </HistoryModal.content>
        </>
    )
}

export { Header }
