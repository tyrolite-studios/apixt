import { useState } from "react"

const headerContentTypes = [
    "application/json",
    "application/xml",
    "application/javascript",
    "application/pdf",
    "application/zip",
    "application/octet-stream",
    "application/ld+json",
    "application/vnd.api+json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/x-www-form-urlencoded",
    "application/x-tar",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "audio/mpeg",
    "audio/wav",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "multipart/form-data",
    "text/html",
    "text/plain",
    "text/css",
    "text/javascript",
    "text/xml",
    "text/csv",
    "text/markdown",
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/ogg"
]
/**
 *
 * @param {*} recommendations Options of Autocomplete as an array
 * @returns
 */
const AutoCompleteInput = ({ recommendations, emptyValue }) => {
    const [inputValue, setInputValue] = useState("")
    const [firstRecommendation, setFirstRecommendation] = useState("")
    const [showFirstRecommendation, setShowFirstRecommendation] = useState(true)
    const [listActive, setListActive] = useState(false)
    const [optionPointerIndex, setOptionPointerIndex] = useState(-1)
    const [scrollWidth, setScrollWidth] = useState(null)
    const [filteredRecommendations, setFilteredRecommendations] = useState(
        recommendations.map((rec) => "p_" + rec)
    )

    const handleInputValueChange = (value) => {
        value = removePrefix(value)
        setInputValue(value)
        filterRecommendations(value)
    }

    const filterRecommendations = (value) => {
        const foundByPrefix = recommendations.filter((rec) =>
            rec.startsWith(value)
        )
        const foundByIncludes = recommendations.filter(
            (rec) => !foundByPrefix.includes(rec) && rec.includes(value)
        )
        const filtered = [
            ...foundByPrefix.map((rec) => "p_" + rec),
            ...foundByIncludes.map((rec) => "i_" + rec)
        ]
        setFilteredRecommendations(filtered.length > 0 ? filtered : [])
        setFirstRecommendation(
            filtered.length > 0 && !filtered[0].startsWith("i_")
                ? removePrefix(filtered[0])
                : ""
        )
        setOptionPointerIndex(-1)
    }

    const removePrefix = (value) => {
        return value.replace(/p_|i_/g, "")
    }

    return (
        <div className="flex">
            <input
                className="z-10 bg-transparent border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                value={inputValue === emptyValue ? "" : inputValue}
                onChange={(e) => {
                    handleInputValueChange(e.target.value)
                }}
                onFocus={(e) => {
                    if (!scrollWidth) setScrollWidth(e.target.scrollWidth)
                    filterRecommendations(e.target.value)
                    setListActive(true)
                }}
                onKeyDown={(e) => {
                    if (
                        showFirstRecommendation !==
                        (scrollWidth === e.target.scrollWidth)
                    )
                        setShowFirstRecommendation(
                            scrollWidth === e.target.scrollWidth
                        )
                    if (e.key === "Enter") {
                        if (optionPointerIndex !== -1) {
                            handleInputValueChange(
                                filteredRecommendations[optionPointerIndex]
                            )
                        } else {
                            setFirstRecommendation("")
                            setListActive(false)
                            //Hier den Input beenden
                        }
                    } else if (e.key === "ArrowRight") {
                        if (optionPointerIndex === -1) {
                            if (firstRecommendation)
                                handleInputValueChange(firstRecommendation)
                        } else {
                            handleInputValueChange(
                                filteredRecommendations[optionPointerIndex]
                            )
                        }
                    } else if (e.key === "ArrowDown") {
                        if (filteredRecommendations.length > 0) {
                            const newIndex = optionPointerIndex + 1
                            if (filteredRecommendations.length > newIndex)
                                setOptionPointerIndex(newIndex)
                        }
                    } else if (e.key === "ArrowUp") {
                        if (filteredRecommendations.length > 0) {
                            const newIndex = optionPointerIndex - 1
                            if (newIndex >= -1) setOptionPointerIndex(newIndex)
                        }
                    }
                }}
                onBlur={() => {
                    setFirstRecommendation("")
                    setListActive(false)
                    //Hier den Input beenden
                }}
            />
            <input
                value={showFirstRecommendation ? firstRecommendation : ""}
                readOnly
                className="text-opacity-40 absolute bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
            {listActive && (
                <div className="absolute bg-gray-700 border border-gray-500 rounded mt-8 z-10 max-h-48 overflow-auto">
                    {filteredRecommendations.map((type, index) => (
                        <div
                            key={index}
                            className={`p-1 cursor-pointer hover:bg-gray-600 text-left ${filteredRecommendations[optionPointerIndex] === type ? "text-red-200" : ""} ${type.startsWith("p_") ? "bg-green-200" : "bg-red-200"}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                handleInputValueChange(e.target.textContent)
                            }}
                        >
                            {removePrefix(type)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
export { AutoCompleteInput, headerContentTypes }
