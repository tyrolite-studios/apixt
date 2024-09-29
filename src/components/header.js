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
    const aContext = useContext(AppContext)
    const SettingsWindow = useModalWindow()

    const logout = () => {
        controller.clearJwt()
        controller.startApp("login")
    }

    return (
        <>
            <div className="stack-h text-sm px-2 py-1 space-x-2 w-full text-header bg-header-bg border border-header-border/50 border-x-0 border-t-0">
                <ButtonGroup buttons={PluginRegistry.headerButtons} />

                <div className="auto" />

                <div className="stack-h text-header-text text-xs gap-1">
                    <Icon name="person" className="text-xl" />
                    <div className="">{aContext.config.username}</div>
                </div>
                <ButtonGroup
                    buttons={[
                        {
                            icon: "build",
                            name: "Settings",
                            onPressed: () => SettingsWindow.open()
                        },
                        {
                            icon: "logout",
                            onPressedEnd: (outside) => {
                                if (!outside) logout()
                            }
                        }
                    ]}
                />
            </div>

            <SettingsWindow.content
                name="Settings"
                minWidth="400px"
                width="75%"
                height="500px"
                transparent={true}
                isolated={true}
                drag
            >
                <Settings {...SettingsWindow.props} />
            </SettingsWindow.content>
        </>
    )
}

export { Header }
