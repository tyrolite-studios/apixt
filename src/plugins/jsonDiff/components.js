import { useContext, useEffect, useState } from "react"
import { useModalWindow } from "components/modal"
import { AppContext } from "components/context"
import * as jsondiffpatch from "jsondiffpatch"
import * as htmlFormatter from "jsondiffpatch/formatters/html"
import { d } from "core/helper"
import { Checkbox, Button } from "components/form"
import { ClassNames } from "core/helper"
import { useLoadingSpinner } from "components/common"

const patcher = jsondiffpatch.create({})

function Mismatch({ status, expectedStatus, close }) {
    return (
        <div className="stack-v divide-y divide-block-border">
            <div className="px-2 bg-warning-bg text-warning-text">
                Http Status mismatch
            </div>
            <div className="p-4 stack-v gap-2">
                <div className="text-center">
                    Expected <kbd>{expectedStatus}</kbd> but got{" "}
                    <kbd>{status}</kbd>
                </div>
                <div className="text-center">
                    <Button name=" Ok " onPressed={close} />
                </div>
            </div>
        </div>
    )
}

function JsonDiff({ url, html, newJson }) {
    const aContext = useContext(AppContext)
    const [showUnchanged, setShowUnchanged] = useState(true)

    const oldJson = JSON.parse(html)

    var delta = patcher.diff(oldJson, newJson)

    htmlFormatter.showUnchanged(showUnchanged)

    const statusCls = ClassNames("p-2 text-sm")
    statusCls.addIf(
        delta,
        "bg-warning-bg text-warning-text",
        "bg-ok-bg text-ok-text"
    )

    return (
        <div className="stack-v divide-y divide-block-border">
            <div className="stack-h p-2 gap-2 text-xs">
                <Checkbox value={showUnchanged} set={setShowUnchanged} />
                <div>Show unchanged</div>
            </div>
            <div className={statusCls.value}>
                {delta ? "Found differences..." : "No differences found"}
            </div>
            <div className="p-4 bg-block-bg text-block-text text-sm overflow-auto">
                {!delta ? (
                    showUnchanged ? (
                        <pre className="opacity-50">
                            {JSON.stringify(
                                oldJson,
                                null,
                                aContext.globalSettings.tabWidth
                            )}
                        </pre>
                    ) : (
                        <div />
                    )
                ) : (
                    <div
                        dangerouslySetInnerHTML={{
                            __html: htmlFormatter.format(delta, oldJson)
                        }}
                    />
                )}
            </div>
        </div>
    )
}

function JsonDiffWindow({ plugin }) {
    const aContext = useContext(AppContext)
    const DiffWindow = useModalWindow()
    const MismatchWindow = useModalWindow()
    const spinner = useLoadingSpinner()
    useEffect(() => {
        for (const [name, details] of Object.entries(
            aContext.apiSettings.apiEnvs
        )) {
            const id = `diff ${name}`
            plugin.addBlockButton({
                id,
                name: `Diff ${name}`,
                isActive: ({ mime, name }) =>
                    name === "Http Response" && mime && mime.endsWith("json")
            })
            plugin.setButtonHandler(id, async ({ html }) => {
                try {
                    const request = aContext.getRawContentPromise(details.url)
                    spinner.start(request.fetchPromise, request.abort)
                    const { status, body } = await request.fetchPromise

                    const expectedStatus = aContext.getLastStatus()
                    if (status !== expectedStatus) {
                        MismatchWindow.open({ status, expectedStatus })
                        return
                    }
                    const json = JSON.parse(body)
                    DiffWindow.open({
                        html,
                        newJson: json
                    })
                } catch (e) {
                    console.error(e)
                }
            })
        }
    }, [])

    return (
        <>
            <DiffWindow.content
                name="Diff with..."
                minWidth="600px"
                height="100%"
            >
                <JsonDiff {...DiffWindow.props} />
            </DiffWindow.content>

            <MismatchWindow.content name="Diff with...">
                <Mismatch {...MismatchWindow.props} />
            </MismatchWindow.content>
        </>
    )
}

export { JsonDiffWindow }
