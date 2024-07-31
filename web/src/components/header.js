import { useState, useContext } from "react"
import { Button, ButtonGroup, Input, TextArea, Select, Checkbox } from "./form"
import { AppContext } from "./context"
import { useModalWindow } from "./modal"
import { CMD } from "../core/tree"
import { getStringifiedJSON } from "../util"
import { useLoadingSpinner } from "./common"
import { d } from "../core/helper"
import { treeBuilder } from "../core/tree"

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

    const fakeLoading = () => {
        aCtx.startContentStream({
            response: [
                { cmd: CMD.ADD_DUMP, name: "Booting message" },
                { cmd: CMD.OPEN_SECTION, name: "Application" },
                { cmd: CMD.ADD_DUMP, name: "My special dump" },
                { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
                { cmd: CMD.OPEN_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Header",
                    html: "<pre>Content-Type: application/json</pre>"
                },
                { cmd: CMD.CLOSE_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Request",
                    html: `<pre class="full colapsible">${getStringifiedJSON({ foo: "bar", "fooo-3": { number: 666, hack: true } }, 4)}</pre>`
                },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.OPEN_SECTION, name: "Application" },
                { cmd: CMD.ADD_DUMP, name: "My special dump" },
                { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
                { cmd: CMD.OPEN_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Header",
                    html: "<pre>Content-Type: application/json</pre>"
                },
                { cmd: CMD.CLOSE_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Request",
                    html: `<pre class="full colapsible">${getStringifiedJSON({ foo: "bar", "fooo-3": { number: 666, hack: true } }, 4)}</pre>`
                },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.END }
            ]
        })
    }

    const errorLoading = () => {
        aCtx.startContentStream({
            response: [
                { cmd: CMD.ADD_DUMP, name: "Booting message" },
                { cmd: CMD.OPEN_SECTION, name: "Application" },
                { cmd: CMD.ADD_DUMP, name: "My special dump" },
                { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Header",
                    html: "<pre>Content-Type: application/json</pre>"
                },
                { cmd: CMD.CLOSE_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Request",
                    html: `<pre class="full colapsible">${getStringifiedJSON({ foo: "bar", "fooo-3": { number: 666, hack: true } }, 4)}</pre>`
                },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.OPEN_SECTION, name: "Application" },
                { cmd: CMD.ADD_DUMP, name: "My special dump" },
                { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
                { cmd: CMD.OPEN_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Header",
                    html: "<pre>Content-Type: application/json</pre>"
                },
                { cmd: CMD.CLOSE_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Request",
                    html: `<pre class="full colapsible">${getStringifiedJSON({ foo: "bar", "fooo-3": { number: 666, hack: true } }, 4)}</pre>`
                },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.END }
            ]
        })
    }

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
                    <Button name="Load..." onClick={() => fakeLoading()} />
                    <Button name="Error..." onClick={() => errorLoading()} />

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
