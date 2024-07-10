import { Select, JsonTextarea } from "../commons"
import { isValidJson, getStringifiedJSON } from "../../util"
import { useState } from "react"

/*
	TODO
	JSON Textarea formatierungen
	Path Logik auf eigene Komponente

*/

const RequestBuilder = () => {
    const [method, setMethod] = useState("")
    const [path, setPath] = useState("")
    const [header, setHeader] = useState({})
    const [body, setBody] = useState({})
    const [bodyDisabled, setBodyDisabled] = useState(true)
    var headerInputTimeout, bodyInputTimeout

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

    const handlePathChange = (event) => {
        setPath(event.target.value)
    }

    const handleHeaderChange = (header) => {
        clearTimeout(headerInputTimeout)
        headerInputTimeout = setTimeout(() => {
            if ((header = isValidJson(header))) {
                setHeader(header)
            } else {
                //evtl Error bars triggern etc
            }
        }, 2000)
    }
    const handleBodyChange = (body) => {
        clearTimeout(bodyInputTimeout)
        bodyInputTimeout = setTimeout(() => {
            if ((body = isValidJson(body))) {
                setBody(body)
            } else {
                //evtl Error bars triggern etc
            }
        }, 2000)
    }

    const handleSubmit = () => {
        const requestParams = {
            method,
            path,
            header,
            body
        }
        console.log("Submitting request:", requestParams)
        // Hier kannst du deine Anfrage senden, z.B. mit fetch oder axios
    }

    const selectProps = {
        options: ["POST", "GET", "DELETE", "PUT", "HEAD"],
        label: "method",
        className:
            "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500",
        onSelect: handleMethodChange
    }
    return (
        <div className="w-1/2 h-full bg-gray-800 p-4">
            <div className="text-white text-2xl">Request Builder</div>
            {/* Method selection */}
            <Select {...selectProps} />
            {/* Path */}
            <input
                type="text"
                value={path}
                onChange={handlePathChange}
                placeholder="Path"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 mt-2"
            />
            {/* Header */}
            <JsonTextarea placeholder="Header" onInput={handleHeaderChange} />
            {/* Body */}
            <JsonTextarea
                placeholder={
                    bodyDisabled ? "Body [Not available for method]" : "Body"
                }
                disabled={bodyDisabled}
                onInput={handleBodyChange}
            />
            {/* Submit button */}
            <button
                onClick={handleSubmit}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 mt-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
                Submit
            </button>
        </div>
    )
}
export { RequestBuilder }
