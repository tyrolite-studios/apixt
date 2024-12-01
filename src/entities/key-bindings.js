import { Fragment, useState, useRef } from "react"
import { EntityStack } from "components/common"
import { Div, Stack, OkCancelLayout, Icon } from "components/layout"
import { d, isString } from "core/helper"
import { useModalWindow } from "components/modal"
import { ClassNames } from "core/helper"

const HotKeySingleKeys = ["Escape", "Enter"]
const HotKeySkipValues = ["Meta", "Control", "Alt", "Shift"]

function KeyBindingEdit({ action, save, close, mapping = {}, ...props }) {
    const [hotKey, setHotKey] = useState(null)
    const recorderRef = useRef(null)

    const onKeyDown = (e) => {
        let newHotKey = ""
        let actionKey = ""
        if (e.metaKey) {
            newHotKey += "m"
        } else if (e.ctrlKey) {
            newHotKey += "c"
        } else if (e.altKey) {
            newHotKey += "a"
        } else if (HotKeySingleKeys.includes(e.key)) {
            actionKey = e.key
        }
        if (newHotKey.length > 0 && e.shiftKey) {
            newHotKey += "i"
        }
        if (newHotKey !== "") {
            actionKey = newHotKey
            if (!HotKeySkipValues.includes(e.key)) {
                actionKey += " " + e.key
            }
        }

        if (e.key !== "Tab") {
            e.preventDefault()
            e.stopPropagation()
        } else return

        if (actionKey === hotKey) {
            return
        }
        setHotKey(actionKey !== "" ? actionKey : null)
    }

    let delAction = null
    if (hotKey && hotKey !== props.hotKey) {
        for (let [currAction, actionHotKey] of Object.entries(mapping)) {
            if (hotKey === actionHotKey) {
                delAction = currAction
            }
        }
    }

    const isHotKeyOnly = (value) => value.match(/^[mca]i?$/)

    const onKeyUp = (e) => {
        if (hotKey !== null && isHotKeyOnly(hotKey)) {
            setHotKey(null)
        }
    }

    const okOp = {
        can: () => hotKey !== null && !isHotKeyOnly(hotKey),
        exec: () => save(hotKey, delAction)
    }

    return (
        <OkCancelLayout ok={okOp.exec} cancel={close}>
            <Stack className="p-2" vertical>
                <div className="text-xs text-center">
                    {'Press HotKey for action "' + action + '":'}
                </div>
                <div className="p-2">
                    <Div
                        onKeyDown={onKeyDown}
                        onKeyUp={onKeyUp}
                        ref={recorderRef}
                        tab
                        className="autofocus border border-1 p-2 focus:outline-none focus:ring focus:ring-focus-border"
                    >
                        <Keys
                            className="justify-center"
                            value={hotKey}
                            emptyMsg="press key(s)"
                        />
                    </Div>
                </div>
                {delAction && (
                    <div className="p-2">
                        <Stack className="p-2 border">
                            <div className="p-2">
                                <Icon name="warning" />
                            </div>
                            <div className="p-2">
                                {`This HotKey is currently assigned to "${delAction}", if you save this assignment gets deleted!`}
                            </div>
                        </Stack>
                    </div>
                )}
            </Stack>
        </OkCancelLayout>
    )
}

function Keys({ value, className, emptyMsg = "not assigned" }) {
    const cls = ClassNames("text-xs", className)

    if (!value) {
        cls.add("opacity-50 text-center")
        return <div className={cls.value}>{emptyMsg}</div>
    }

    const rawKeys = isString(value) ? value.split(" ") : []
    const keys = []
    if (rawKeys.length) {
        let firstKey = rawKeys.shift()
        if (rawKeys.length > 0) {
            switch (firstKey) {
                case "c":
                    firstKey = "Ctrl"
                    break

                case "m":
                    firstKey = "Cmd"
                    break
            }
        }
        keys.push(firstKey)
        if (rawKeys.length > 0) keys.push(...rawKeys)
    }
    cls.add("stack-h gap-2")
    return (
        <Div className={cls.value}>
            {keys.map((item, i) => (
                <Fragment key={i}>
                    {i > 0 && (
                        <div className="py-1 border-1 border-transparent">
                            +
                        </div>
                    )}
                    <div className="bg-input-text/80 px-2 py-1 border border-1 border-app-text/50 rounded-lg">
                        {item}
                    </div>
                </Fragment>
            ))}
        </Div>
    )
}

function KeyBindingsStack({ keyBindingsIndex }) {
    const EditModal = useModalWindow()
    const actions = [
        {
            action: "edit",
            op: {
                exec: (selected) => {
                    const index = selected[0]
                    const model = keyBindingsIndex.getEntityObject(index)
                    EditModal.open({
                        action: model.value,
                        mappings: keyBindingsIndex.model,
                        save: (newKey, delAction) => {
                            if (delAction) {
                                const delIndex =
                                    keyBindingsIndex.getEntityByPropValue(
                                        "value",
                                        delAction
                                    )
                                keyBindingsIndex.deleteEntity(delIndex)
                            }
                            keyBindingsIndex.setEntityPropValue(
                                index,
                                "key",
                                newKey
                            )
                            EditModal.close()
                        }
                    })
                },
                can: (selected) => selected.length === 1
            }
        },
        {
            action: "delete",
            op: {
                exec: (selected) => {
                    for (const index of selected) {
                        keyBindingsIndex.setEntityPropValue(index, "key", "")
                    }
                },
                can: (selected) => selected.length > 0
            }
        }
    ]
    const itemActions = [
        {
            icon: "check",
            action: (index, selected, setSelected) =>
                selected.includes(index)
                    ? setSelected(selected.filter((x) => x !== index))
                    : setSelected([...selected, index])
        },
        {
            icon: "edit",
            action: (index) => actions[0].op.exec([index])
        },
        {
            icon: "delete",
            action: (index) => actions[1].op.exec([index])
        }
    ]

    return (
        <>
            <EntityStack
                entityIndex={keyBindingsIndex}
                actions={actions}
                itemActions={itemActions}
                render={({ value, key }) => {
                    const rawKeys = isString(key) ? key.split(" ") : []
                    const keys = []
                    if (rawKeys.length) {
                        let firstKey = rawKeys.shift()
                        if (rawKeys.length > 0) {
                            switch (firstKey) {
                                case "c":
                                    firstKey = "Ctrl"
                                    break

                                case "m":
                                    firstKey = "Cmd"
                                    break
                            }
                        }
                        keys.push(firstKey)
                        if (rawKeys.length > 0) keys.push(...rawKeys)
                    }
                    return (
                        <Stack key={value} className="gap-4">
                            <div className="stack-h text-app-text text-xs gap-2">
                                <Div className="text-sm px-2" minWidth="68px">
                                    {value}
                                </Div>

                                <Keys value={key} />
                            </div>
                        </Stack>
                    )
                }}
            />
            <EditModal.content name="Edit key binding">
                <KeyBindingEdit {...EditModal.props} />
            </EditModal.content>
        </>
    )
}

export { KeyBindingsStack }
