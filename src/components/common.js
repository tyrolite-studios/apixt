import { useRef, useState, useEffect } from "react"
import { useModalWindow } from "./modal"
import { ClassNames, isValidJson, d } from "core/helper"
import { Button, AutoCompleteInput } from "./form"
import { Div } from "./layout"

function useComponentUpdate() {
    const mounted = useMounted()
    const [updates, setUpdates] = useState(false)
    const updateRef = useRef(null)
    updateRef.current = updates
    return () => {
        if (mounted.current) {
            setUpdates(!updateRef.current)
        }
    }
}

function useMounted() {
    const mounted = useRef(false)
    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    })
    return mounted
}

function useExtractDimProps(
    { width, minWidth, maxWidth, height, minHeight, maxHeight },
    style = {}
) {
    if (width) {
        style.width = width
    }
    if (minWidth) {
        style.minWidth = maxWidth ? `min(${minWidth}, ${maxWidth})` : minWidth
    }
    if (maxWidth) {
        style.maxWidth = minWidth ? `max(${minWidth}, ${maxWidth})` : maxWidth
    }
    if (height) {
        style.height = height
    }
    if (minHeight) {
        style.minHeight = maxHeight
            ? `min(${minHeight}, ${maxHeight})`
            : minHeight
    }
    if (maxHeight) {
        style.maxHeight = minHeight
            ? `max(${minHeight}, ${maxHeight})`
            : maxHeight
    }
    return style
}

function DualRing({ size = 48, className }) {
    const cls = new ClassNames("lds-dual-ring", className)
    cls.addIf(size <= 20, "after:border", "after:border-4")
    return (
        <Div
            width={size + "px"}
            height={size + "px"}
            className={cls.value}
        ></Div>
    )
}

function LoadingSpinner({ abort, close }) {
    return (
        <div className="stack-v gaps-1 p-4 text-center">
            <div className="px-4 py-2">Loading...</div>

            <div>
                <DualRing />
            </div>

            <div>
                <Button
                    name="Abort"
                    onPressed={() => {
                        abort()
                    }}
                />
            </div>
        </div>
    )
}

function useLoadingSpinner() {
    const SpinnerWindow = useModalWindow()

    return {
        start: (promise, abort) => {
            SpinnerWindow.open({
                abort,
                cleanUp: (source) => {
                    if (source) abort()
                }
            })
            promise.finally(() => SpinnerWindow.close())
        },
        Modal: (
            <SpinnerWindow.content width="250px">
                <LoadingSpinner {...SpinnerWindow.props} />
            </SpinnerWindow.content>
        )
    }
}

function HighlightKeys({ obj }) {
    const keys = Object.keys(obj)
    return (
        <div>
            {keys.map((key, index) => (
                <span key={index}>
                    <span className="opacity-50">{key}: </span>
                    {obj[key].value}
                    {index === keys.length - 1 ? " " : ", "}
                </span>
            ))}
        </div>
    )
}

function HighlightMatches({ text, search, className }) {
    const parts = splitByMatch(text, search)
    return (
        <span>
            {parts.map((part, index) =>
                part.toLowerCase() === search.toLowerCase() ? (
                    <span key={index} className={className}>
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </span>
    )
}

const emptyValue = "<Enter Value>"

const KeyValueEditor = ({ object, sendObjectToParent }) => {
    const [editingValue, setEditingValue] = useState(null)

    const handleDeleteKey = (key) => {
        const updatedKeys = { ...object.values }
        delete updatedKeys[key]
        sendObjectToParent({
            suggestions: object.suggestions,
            values: updatedKeys
        })
    }

    const addNewKey = (value) => {
        if (value.trim() !== "" && !object.values.hasOwnProperty(value)) {
            const updatedKeys = { ...object.values }
            updatedKeys[value] = { value: emptyValue, type: "string" }
            sendObjectToParent({
                suggestions: object.suggestions,
                values: updatedKeys
            })
        }
    }

    const editKey = (key, newKey) => {
        setEditingValue(null)
        if (key === newKey) return
        const updatedObject = { ...object }
        updatedObject.values[newKey] = updatedObject.values[key]
        delete updatedObject.values[key]
        sendObjectToParent(updatedObject)
    }

    const editValue = (key, value) => {
        const updatedObject = { ...object }
        updatedObject.values[key] = {
            suggestions: updatedObject.values[key].suggestions,
            type: updatedObject.values[key].type,
            value
        }
        setEditingValue(null)
        sendObjectToParent(updatedObject)
    }

    return (
        <div className="bg-gray-700 p-2 rounded text-sm">
            {Object.entries(object.values).map(
                ([key, { value, type, suggestions }]) => (
                    <div
                        key={key}
                        className="text-white flex justify-between items-center"
                    >
                        {editingValue === key ? (
                            object.suggestions ? (
                                <AutoCompleteInput
                                    defaultValue={key}
                                    suggestions={object.suggestions}
                                    onClose={(newKey) => editKey(key, newKey)}
                                />
                            ) : (
                                <input
                                    type="text"
                                    defaultValue={key}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.target.blur()
                                        }
                                    }}
                                    onBlur={(e) => editKey(key, e.target.value)}
                                />
                            )
                        ) : (
                            <span
                                onPressed={() => setEditingValue(key)}
                                className="cursor-pointer flex items-center"
                            >
                                {key}
                            </span>
                        )}
                        <div className="flex flex-col">
                            {editingValue === key + value ? (
                                suggestions ? (
                                    <AutoCompleteInput
                                        defaultValue={value}
                                        suggestions={suggestions}
                                        onClose={(val) => editValue(key, val)}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        defaultValue={value}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.target.blur()
                                            }
                                        }}
                                        onBlur={(e) =>
                                            editValue(key, e.target.value)
                                        }
                                    />
                                )
                            ) : (
                                <span
                                    onClick={() => setEditingValue(key + value)}
                                    className="cursor-pointer flex items-center"
                                >
                                    {value === emptyValue ? (
                                        <div className="text-red-600">
                                            {value}
                                        </div>
                                    ) : (
                                        value
                                    )}
                                    <Button
                                        icon="delete"
                                        className="text-sm text-red-500 hover:text-red-800 p-1 ml-2"
                                        onPressed={() => handleDeleteKey(key)}
                                    />
                                </span>
                            )}
                        </div>
                    </div>
                )
            )}
            <div className="mt-2">
                {object.suggestions ? (
                    <AutoCompleteInput
                        defaultValue=""
                        suggestions={object.suggestions}
                        onClose={(value) => addNewKey(value)}
                    />
                ) : (
                    <input />
                )}
            </div>
        </div>
    )
}

const splitByMatch = (string, search) => {
    if (search === "") return [string]
    const result = []
    let currentIndex = 0
    let matchIndex

    const lcString = string.toLowerCase()
    const lcSearch = search.toLowerCase()

    while ((matchIndex = lcString.indexOf(lcSearch, currentIndex)) !== -1) {
        result.push(
            string.slice(currentIndex, matchIndex),
            string.slice(matchIndex, matchIndex + search.length)
        )
        currentIndex = matchIndex + search.length
    }

    result.push(string.slice(currentIndex))
    return result
}

const JsonTextarea = ({
    value,
    sendJsonValidityToParent,
    sendTextareaValueToParent
}) => {
    const handleChange = (val) => {
        sendTextareaValueToParent(val)
        sendJsonValidityToParent(isValidJson(val))
    }

    return (
        <textarea
            placeholder="Enter Body"
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onChange={(e) => handleChange(e.target.value)}
            value={value}
        />
    )
}

export {
    useComponentUpdate,
    useMounted,
    useExtractDimProps,
    HighlightMatches,
    splitByMatch,
    useLoadingSpinner,
    DualRing,
    KeyValueEditor,
    HighlightKeys,
    JsonTextarea
}
