import { useEffect } from "react"
import { useModalWindow } from "components/modal"
import { Select, Button, ButtonGroup, Input } from "components/form"
// import { Button } from "components/commons"
import { KeyValueEditor, HighlightKeys, JsonTextarea } from "components/common"
import { useState } from "react"
import { isValidJson, d } from "core/helper"
import { PathInput } from "./path-input"
import { headerContentTypes, requestHeaderOptions } from "./helper"
import { OkCancelLayout } from "components/layout"

const emptyValue = "<Enter Value>"

const httpMethodOptions = [
    { id: "POST", name: "POST" },
    { id: "GET", name: "GET" },
    { id: "DELETE", name: "DELETE" },
    { id: "PUT", name: "PUT" },
    { id: "HEAD", name: "HEAD" }
]

const RequestBuilder = ({ close }) => {
    const [method, setMethodRaw] = useState("POST")
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

    const setMethod = (selectedMethod) => {
        setMethodRaw(selectedMethod)
        enableOptions(selectedMethod)
    }

    const removeCurrentOptions = () => {
        setBodyDisabled(true)
        //...
    }

    const enableOptions = (selectedMethod) => {
        removeCurrentOptions()
        if (selectedMethod === "POST") {
            setBodyDisabled(false)
        }
        //...
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

    return (
        <OkCancelLayout
            cancel={close}
            ok={() => d("SUBMIT", { method, headers, body })}
        >
            <div className="h-full p-4 flex flex-col gap-y-4">
                <div className="stack-h w-full text-white flex flex-row justify-normal items-center gap-4 text-sm">
                    {/* Method selection */}
                    <Select
                        options={httpMethodOptions}
                        value={method}
                        set={setMethod}
                    />
                    {/* Path */}
                    <div className="auto stack-h items-center gap-2">
                        <div className="text-app-text">Path: </div>
                        <Input
                            value={path}
                            set={setPath}
                            autoFocus
                            className="auto"
                        />
                        {/* <PathInput sendPathToParent={handlePathChange} /> */}
                    </div>
                </div>
                {/* Header */}
                <div>
                    <div className="text-app-text flex justify-between items-center">
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
                                <ButtonGroup
                                    gapped={false}
                                    buttons={[
                                        {
                                            name: "JSON",
                                            activated: true,
                                            value: isJson,
                                            className:
                                                "not_py-0 not_px-2 py-2 px-4",
                                            onPressed: () => {
                                                isJson ? null : setIsJson(true)
                                                setJsonIsValid(
                                                    isValidJson(bodyValue)
                                                )
                                                setBody(bodyValue)
                                            }
                                        },
                                        {
                                            name: "Raw",
                                            activated: false,
                                            value: isJson,
                                            className:
                                                "not_py-0 not_px-2 py-2 px-4",
                                            onPressed: () => {
                                                !isJson
                                                    ? null
                                                    : setIsJson(false)
                                                setBody(bodyValue)
                                            }
                                        }
                                    ]}
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
                    <Button
                        onPressed={handleSubmit}
                        mode="active"
                        label="Submit"
                    />
                ) : null}
            </div>
        </OkCancelLayout>
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
            width="600px"
            height="500px"
        >
            <RequestBuilder {...RequestBuilderModal.props} />
        </RequestBuilderModal.content>
    )
}

export { RequestBuilderWindow }
