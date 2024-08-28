import { useEffect } from "react"
import { useModalWindow } from "components/modal"
import { Select, Button } from "components/form"
// import { Button } from "components/commons"
import { KeyValueEditor, HighlightKeys, JsonTextarea } from "components/common"
import { useState } from "react"
import { isValidJson, d } from "core/helper"
import { PathInput } from "./path-input"
import { headerContentTypes, requestHeaderOptions } from "./helper"

const emptyValue = "<Enter Value>"

const RequestBuilder = () => {
    const [method, setMethod] = useState("post")
    const [path, setPath] = useState("")
    const [headers, setHeaders] = useState({
        values: {
            "Content-Type": {
                value: "application/json",
                type: "string",
                suggestions: headerContentTypes
            },
            "Content-Length": {
                value: 50,
                type: "number",
                min: 0
            },
            "X-mx-Header": {
                value: "blabla",
                type: "string"
            }
        },
        suggestions: Object.keys(requestHeaderOptions)
    })
    const [body, setBody] = useState("")
    const [bodyValue, setBodyValue] = useState("")
    const [bodyDisabled, setBodyDisabled] = useState(false)
    const [isJson, setIsJson] = useState(true)
    const [jsonIsValid, setJsonIsValid] = useState(false)
    const [headersVisible, setHeadersVisible] = useState(false)

    const handleMethodChange = (selectedMethod) => {
        setMethod(selectedMethod)
        enableOptions(selectedMethod)
    }

    const removeCurrentOptions = () => {
        setBodyDisabled(true)
        //...
    }

    const enableOptions = (selectedMethod) => {
        removeCurrentOptions()
        if (selectedMethod === "post") {
            setBodyDisabled(false)
        }
        //...
    }

    const handlePathChange = (path) => {
        setPath(path)
    }

    const handleSubmit = () => {
        const emptyHeaders = Object.keys(headers.values).filter(
            (header) => headers.values[header] === emptyValue
        )
        for (const header of emptyHeaders) {
            delete headers.values[header]
        }

        const requestParams = {
            method,
            headers: headers.values,
            body
        }
        console.log("Submitting request:", requestParams)
        if (!method || !path || Object.keys(headers).length === 0) {
            console.error(
                "missing " + (!method ? "method" : !path ? "path" : "headers")
            )
        } else {
            //URL NOCH RICHTIG MACHEN
            const request = new Request("/" + path, requestParams)
            fetch(request)
                .then((response) => {
                    if (response.status === 200) {
                        console.log("success")
                    } else {
                        throw new Error("Something went wrong on API server!")
                    }
                })
                .catch((error) => {
                    console.error(error)
                })
        }
    }
    const selectProps = {
        options: {
            post: "POST",
            get: "GET",
            delete: "DELETE",
            put: "PUT",
            head: "HEAD"
        },
        defaultValue: "post",
        onSelect: handleMethodChange
    }

    return (
        <div className="w-1/2 h-full p-2 flex flex-col gap-4">
            <div className="text-white flex flex-row justify-normal items-center py-4 gap-4 text-sm">
                {/* Method selection */}
                <Select {...selectProps} />
                {/* Path */}
                <div className="flex items-center gap-1">
                    <span className="text-white">Path: </span>
                    <input
                        value={path}
                        onChange={(e) => handlePathChange(e.target.value)}
                        className="ml-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    />
                    {/* <PathInput sendPathToParent={handlePathChange} /> */}
                </div>
            </div>
            {/* Header */}
            <div>
                <div className="text-white flex justify-between items-center">
                    <span>Header</span>
                    <button
                        className="text-sm text-white p-1"
                        onClick={() => setHeadersVisible(!headersVisible)}
                    >
                        {headersVisible ? "Hide" : "Show"}
                    </button>
                </div>
                {headersVisible ? (
                    <KeyValueEditor
                        object={headers}
                        sendObjectToParent={(newHeaders) =>
                            setHeaders(newHeaders)
                        }
                    />
                ) : (
                    <div className="text-white bg-gray-700 p-2 rounded text-sm text-left">
                        <span className="truncate block overflow-hidden whitespace-nowrap">
                            <HighlightKeys obj={headers.values} />
                        </span>
                    </div>
                )}
            </div>
            {/* Body */}
            {!bodyDisabled ? (
                <div className="flex flex-col">
                    <div className="flex justify-between items-center">
                        <div className="flex">
                            <Button
                                name="JSON"
                                activated={true}
                                value={isJson}
                                className="not_py-0 not_px-2 py-2 px-4"
                                onPressed={() => {
                                    isJson ? null : setIsJson(true)
                                    setJsonIsValid(isValidJson(bodyValue))
                                    setBody(bodyValue)
                                }}
                            />
                            <Button
                                name="Raw"
                                activated={false}
                                value={isJson}
                                className="not_py-0 not_px-2 py-2 px-4"
                                onPressed={() => {
                                    !isJson ? null : setIsJson(false)
                                    setBody(bodyValue)
                                }}
                            />
                        </div>
                        {isJson ? (
                            <div className="text-sm p-1">
                                {jsonIsValid || body === "" ? (
                                    <div className="text-green-700">
                                        Valid Body
                                    </div>
                                ) : (
                                    <div className="text-red-700">
                                        Invalid Body
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                    <div>
                        {isJson ? (
                            <JsonTextarea
                                sendJsonValidityToParent={(valid) =>
                                    setJsonIsValid(valid)
                                }
                                sendTextareaValueToParent={(val) => {
                                    setBody(val)
                                    setBodyValue(val)
                                }}
                                value={bodyValue}
                            />
                        ) : (
                            <textarea
                                className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                placeholder="Enter text"
                                onChange={(e) => {
                                    setBody(e.target.value)
                                    setBodyValue(e.target.value)
                                }}
                                value={bodyValue}
                            />
                        )}
                    </div>
                </div>
            ) : null}
            {/* Submit button */}
            {method &&
            path &&
            Object.keys(headers.values).length !== 0 &&
            (method === "post" && isJson
                ? jsonIsValid || body === ""
                : true) ? (
                <Button onPressed={handleSubmit} mode="active" label="Submit" />
            ) : null}
        </div>
    )
}

function RequestBuilderWindow({ plugin }) {
    const RequestBuilderModal = useModalWindow()

    useEffect(() => {
        plugin.setButtonHandler("builder", () => {
            RequestBuilderModal.open({})
        })
    }, [])

    return (
        <RequestBuilderModal.content
            name="Query Builder"
            width="70%"
            height="100%"
        >
            <RequestBuilder />
        </RequestBuilderModal.content>
    )
}

export { RequestBuilderWindow }