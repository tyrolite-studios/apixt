import { useState, useEffect } from "react"
import { isValidJson, getStringifiedJSON } from "../util"

const Select = ({ label, options, onSelect, disabled = false }) => {
    return (
        <div>
            <select
                id={label}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                disabled={disabled}
                onChange={(e) => onSelect(e.target.value)}
            >
                <option defaultValue>Select {label}</option>
                {Object.keys(options).map((option, index) => (
                    <option key={index} value={option}>
                        {options[option]}
                    </option>
                ))}
            </select>
        </div>
    )
}

const Button = ({ label, mode = "normal", onClick, disabled = false }) => {
    let cls = ""
    if (mode === "normal") {
        cls =
            "py-2 px-4 me-2 mb-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
    } else if (mode === "active") {
        cls =
            "focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
    } else if (mode === "warning") {
        cls =
            "focus:outline-none text-white bg-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-300 font-medium rounded-lg text-sm px-4 py-2 me-2 mb-2 dark:focus:ring-yellow-900"
    } else if (mode === "error") {
        cls =
            "focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-4 py-2 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
    }
    return (
        <button className={cls} disabled={disabled} onClick={onClick}>
            {label}
        </button>
    )
}

const JsonTextarea = ({
    sendJsonValidityToParent,
    sendTextareaValueToParent
}) => {
    const [textareaValue, setTextareaValue] = useState("{}")
    const [validationTimeout, setValidationTimeout] = useState(null)

    useEffect(() => {
        if (validationTimeout) clearTimeout(validationTimeout)
        setValidationTimeout(
            setTimeout(() => {
                let json
                if ((json = isValidJson(textareaValue))) {
                    setTextareaValue(getStringifiedJSON(json, 4))
                    sendTextareaValueToParent(textareaValue)
                    sendJsonValidityToParent(true)
                } else {
                    setTextareaValue(textareaValue)
                    sendTextareaValueToParent(textareaValue)
                    sendJsonValidityToParent(false)
                }
            }, 2000)
        )
    }, [textareaValue])

    return (
        <textarea
            placeholder="Enter Body"
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onChange={(e) => setTextareaValue(e.target.value)}
            value={textareaValue}
        />
    )
}

export { Select, JsonTextarea, Button }
