import { useContext, useEffect, useState, useRef } from "react"
import { useModalWindow } from "components/modal"
import { AppContext } from "components/context"
import * as jsondiffpatch from "jsondiffpatch"
import * as htmlFormatter from "jsondiffpatch/formatters/html"
import { d } from "core/helper"
import { Checkbox } from "components/form"
import { ClassNames } from "core/helper"
import { useLoadingSpinner } from "components/common"
import { OkCancelLayout } from "components/layout"

const patcher = jsondiffpatch.create({})

function Mismatch({ status, expectedStatus, close }) {
    const delta = patcher.diff(status, expectedStatus)

    return (
        <OkCancelLayout ok={() => close()} cancel={() => close()}>
            <div className="stack-v divide-y divide-block-border">
                <div className="p-2 bg-warning-bg text-warning-text text-sm">
                    Http Status Mismatch...
                </div>
                <DeltaOutput json={expectedStatus} delta={delta} />
            </div>
        </OkCancelLayout>
    )
}

function DeltaOutput({ delta, json, showUnchanged = false }) {
    const aContext = useContext(AppContext)
    htmlFormatter.showUnchanged(showUnchanged)

    return (
        <div className="p-4 bg-block-bg text-block-text text-sm overflow-auto">
            {!delta ? (
                showUnchanged ? (
                    <pre className="opacity-50">
                        {JSON.stringify(
                            json,
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
                        __html: htmlFormatter.format(delta, json)
                    }}
                />
            )}
        </div>
    )
}

function JsonDiff({ content, newJson, close }) {
    const [showUnchanged, setShowUnchanged] = useState(true)

    const oldJson = JSON.parse(content)

    var delta = patcher.diff(oldJson, newJson)

    const statusCls = ClassNames("p-2 text-sm")
    statusCls.addIf(
        delta,
        "bg-warning-bg text-warning-text",
        "bg-ok-bg text-ok-text"
    )

    return (
        <OkCancelLayout ok={() => close()} cancel={() => close()}>
            <div className="stack-v divide-y divide-block-border">
                <div className="stack-h p-2 gap-2 text-xs">
                    <Checkbox value={showUnchanged} set={setShowUnchanged} />
                    <div>Show unchanged</div>
                </div>
                <div className={statusCls.value}>
                    {delta ? "Found differences..." : "No differences found"}
                </div>
                <DeltaOutput
                    json={oldJson}
                    delta={delta}
                    showUnchanged={showUnchanged}
                />
            </div>
        </OkCancelLayout>
    )
}

function JsonDiffWindow({ plugin }) {
    const aContext = useContext(AppContext)
    const DiffWindow = useModalWindow()
    const MismatchWindow = useModalWindow()
    const spinner = useLoadingSpinner()
    const lastIds = useRef()

    useEffect(() => {
        const apiEnvs = aContext.apiEnvIndex.getEntityObjects()

        if (lastIds.current) {
            plugin.deleteBlockButtons(lastIds.current)
        }
        lastIds.current = []
        for (const { name, value } of apiEnvs) {
            const id = `diff ${name}`
            lastIds.current.push(id)
            plugin.addBlockButton({
                id,
                name: `Diff ${name}`,
                isActive: ({ mime, tags = [] }) =>
                    tags.includes("api.response") &&
                    mime &&
                    mime.endsWith("json"),
                overwrite: true
            })
            plugin.setButtonHandler(id, async ({ content }) => {
                try {
                    const request = aContext.getEnvContentPromise(value)
                    spinner.start(request.fetchPromise, request.abort)
                    const { status, body } = await request.fetchPromise

                    const expectedStatus = aContext.getLastStatus()
                    if (status !== expectedStatus) {
                        MismatchWindow.open({ status, expectedStatus })
                        return
                    }
                    const json = JSON.parse(body)
                    DiffWindow.open({
                        content,
                        newJson: json
                    })
                } catch (e) {
                    console.error(e)
                }
            })
        }
    }, [aContext.apiEnvIndex.lastModified])

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

            {spinner.Modal}
        </>
    )
}

export { JsonDiffWindow }
