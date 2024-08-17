import { Button, ButtonGroup } from "./form"
import { useModalWindow } from "./modal"
import { PluginRegistry } from "core/plugin"
import { Settings } from "./settings"
import { d } from "core/helper"

function Header() {
    const SettingsWindow = useModalWindow()

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
                    <Button
                        icon="build"
                        name="Settings"
                        onClick={() => SettingsWindow.open()}
                    />
                    <Button icon="logout" />
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
