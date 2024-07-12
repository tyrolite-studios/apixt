import { Select, JsonTextarea, Button } from "../commons"
import { isValidJson, getStringifiedJSON } from "../../util"
import { useState } from "react"
import { PathInput } from "./PathInput"

/*
	TODO
	JSON Textarea formatierungen
	Path Logik auf eigene Komponente
*/

const RequestBuilder = () => {
    const [method, setMethod] = useState("")
    const [path, setPath] = useState("")
    const [headers, setHeaders] = useState({
        "Content-Type": "application/json",
        "Content-Length": 50,
        "X-mx-Header": "blabla"
    })
    const [body, setBody] = useState("")
    const [bodyDisabled, setBodyDisabled] = useState(true)
    const [isJson, setIsJson] = useState(true)
    const [jsonIsValid, setJsonIsValid] = useState(true)
    const [headersVisible, setHeadersVisible] = useState(false)
    const [editingHeader, setEditingHeader] = useState(null)

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
        if (selectedMethod.toLowerCase() === "post") {
            setBodyDisabled(false)
        }
        //...
    }

    const handlePathChange = (path) => {
        setPath(path)
    }

    const handleHeaderValueChange = (key, newValue) => {
        setHeaders({
            ...headers,
            [key]: newValue
        })
    }

    const handleSubmit = () => {
        const requestParams = {
            method,
            headers,
            body
        }
        console.log("Submitting request:", requestParams)
        if (!method || !path || Object.keys(headers).length === 0) {
            console.error(
                "missing " + (!method ? "method" : !path ? "path" : "headers")
            )
        } else {
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
        label: "method",
        onSelect: handleMethodChange
    }

    const headerPreview = Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")

    return (
        <div className="w-1/2 h-full bg-gray-800 p-4 flex flex-col gap-4">
            <div className="text-white text-2xl">Request Builder</div>
            <div className="text-white text-2xl flex flex-row justify-normal items-center py-4 gap-4">
                {/* Method selection */}
                <Select {...selectProps} />
                {/* Path */}
                <PathInput sendPathToParent={handlePathChange} />
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
                    <div className="bg-gray-700 p-2 rounded text-sm">
                        {Object.entries(headers).map(([key, value]) => (
                            <div
                                key={key}
                                className="text-white flex justify-between items-center"
                            >
                                <span>{key}</span>
                                {editingHeader === key ? (
                                    <input
                                        className="ml-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                        type="text"
                                        value={value}
                                        onChange={(e) =>
                                            handleHeaderValueChange(
                                                key,
                                                e.target.value
                                            )
                                        }
                                        onBlur={() => setEditingHeader(null)}
                                    />
                                ) : (
                                    <span
                                        onClick={() => setEditingHeader(key)}
                                        className="cursor-pointer"
                                    >
                                        {value}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-white bg-gray-700 p-2 rounded text-sm">
                        <span className="truncate block overflow-hidden whitespace-nowrap">
                            {headerPreview}
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
                                label="JSON"
                                mode={isJson ? "active" : "normal"}
                                onClick={() =>
                                    isJson ? null : setIsJson(true)
                                }
                            />
                            <Button
                                label="Raw"
                                mode={!isJson ? "active" : "normal"}
                                onClick={() =>
                                    !isJson ? null : setIsJson(false)
                                }
                            />
                        </div>
                        {isJson ? (
                            <div className="text-sm p-1">
                                {jsonIsValid ? (
                                    <div className="text-green-700">
                                        Valid JSON
                                    </div>
                                ) : (
                                    <div className="text-red-700">
                                        Invalid JSON
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
                                sendTextareaValueToParent={(val) =>
                                    setBody(val)
                                }
                            />
                        ) : (
                            <textarea
                                className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                placeholder="Enter text"
                                onChange={(e) => setBody(e.target.value)}
                            />
                        )}
                    </div>
                </div>
            ) : null}
            {/* Submit button */}
            {method &&
            path &&
            Object.keys(headers).length !== 0 &&
            (method === "post" ? jsonIsValid : true) ? (
                <Button onClick={handleSubmit} mode="active" label="Submit" />
            ) : null}
        </div>
    )
}
export { RequestBuilder }
