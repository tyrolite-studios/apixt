import { Button, ButtonGroup } from "./form"
import { useModalWindow } from "./modal"
import { PluginRegistry } from "core/plugin"
import { Settings } from "./settings"
import { d } from "core/helper"
import { useContext } from "react"
import { AppContext } from "./context"
import { Icon } from "./layout"

const controller = window.controller

function Header() {
    const aCtx = useContext(AppContext)
    const SettingsWindow = useModalWindow()

    const logout = () => {
        controller.clearJwt()
        controller.startApp("login")
    }

    return (
        <>
            <div className="stack-h text-sm px-2 py-1 space-x-2 w-full text-header bg-header-bg border border-header-border/50 border-x-0 border-t-0">
                <ButtonGroup>
                    {PluginRegistry.headerButtons.map(({ id, ...props }, i) => (
                        <Button key={i} {...props} />
                    ))}
                </ButtonGroup>

                <div className="auto" />

                <ButtonGroup>
                    <div className="stack-h text-header-text text-xs gap-1">
                        <Icon name="person" className="text-xl" />
                        <div className="">{aCtx.config.username}</div>
                    </div>
                    <Button
                        icon="build"
                        name="Settings"
                        onPressed={() => SettingsWindow.open()}
                    />
                    <Button
                        icon="logout"
                        onPressedEnd={(outside) => {
                            if (!outside) logout()
                        }}
                    />
                </ButtonGroup>
            </div>

            <SettingsWindow.content
                name="Settings"
                minWidth="400px"
                transparent={true}
            >
                <Settings {...SettingsWindow.props} />
            </SettingsWindow.content>
        </>
    )
}

export { Header }
