import { useState, useContext } from "react"
import { Button, ButtonGroup, Input, TextArea, Select, Checkbox } from "./form"
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
function History({ openModal, close }) {
    const myOptions = { 666: "Evil", 42: "The answer" }

    return (
        <div className="p-8">
            History in the making...
            <br />
            <br />
            <div className="stack-h gap-2 items-start">
                <Input name="Bla" />
                <TextArea />
                <Select options={myOptions} />
                <Checkbox />
            </div>
            <br />
            <br />
            <ButtonGroup>
                <Button onClick={() => openModal()} name="Open nested..." />
                <Button onClick={() => close()} name="Close" />
                <Button
                    onClick={() => {
                        close()
                        openModal()
                    }}
                    name="Close and open..."
                />
            </ButtonGroup>
        </div>
    )
}

function Header() {
    const aCtx = useContext(AppContext)

    const TestWindow = useModalWindow()
    const HistoryWindow = useModalWindow()

    const [lastCol, setLastCol] = useState("255 255 255")
    const [lastBg, setLastBg] = useState("0 0 0")

    const switchTheme = () => {
        const style = document.documentElement.style
        const oldBg = style.getPropertyValue("--app-bg")
        const oldCol = style.getPropertyValue("--app-text")
        style.setProperty("--app-bg", lastBg)
        style.setProperty("--app-text", lastCol)
        setLastBg(oldBg)
        setLastCol(oldCol)
    }
    return (
        <>
            <div className="stack-h text-sm px-2 py-1 space-x-2 w-full text-header bg-header-bg border border-header-border/50 border-x-0 border-t-0">
                <ButtonGroup>
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
                </ButtonGroup>

                <div className="auto" />

                <ButtonGroup>
                    <Button name="Switch Theme" onClick={switchTheme} />
                    <Button icon="build" name="Settings" />
                    <Button icon="logout" />
                </ButtonGroup>
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
