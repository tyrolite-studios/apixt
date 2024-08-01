import { useState, useMemo, useEffect, useRef } from "react"

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

const emptyValue = "<Enter Value>"

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
/**
 *
 * @param {*} recommendations Options of Autocomplete as an array
 * @returns
 */
function AutoCompleteInput({ recommendations }) {
    const [inputValue, setInputValue] = useState("")
    const [firstRecommendation, setFirstRecommendation] = useState("")
    const [showFirstRecommendation, setShowFirstRecommendation] = useState(true)
    const [listActive, setListActive] = useState(false)
    const [optionPointerIndex, setOptionPointerIndex] = useState(-1)
    const [scrollWidth, setScrollWidth] = useState(null)
    const optionsRef = useRef(null)

    const removePrefix = (value) => {
        return value ? value.replace(/p_|i_/g, "") : value
    }

    const value = removePrefix(inputValue)

    const filteredRecommendations = useMemo(() => {
        const foundByPrefix = recommendations.filter((rec) =>
            rec.toLowerCase().startsWith(value.toLowerCase())
        )
        const foundByIncludes = recommendations.filter(
            (rec) =>
                !foundByPrefix.includes(rec) &&
                rec.toLowerCase().includes(value.toLowerCase())
        )
        const filtered = [
            ...foundByPrefix.map((rec) => "p_" + rec),
            ...foundByIncludes.map((rec) => "i_" + rec)
        ]
        return filtered
    }, [inputValue])

    useEffect(() => {
        if (inputValue !== "" && !listActive) setListActive(true)
        let recommendation = ""
        if (
            filteredRecommendations.length > 0 &&
            !filteredRecommendations[0].startsWith("i_")
        ) {
            recommendation =
                value +
                removePrefix(filteredRecommendations[0]).slice(value.length)
        }
        if (inputValue !== "" || (inputValue === "" && listActive))
            setFirstRecommendation(recommendation)
        setOptionPointerIndex(-1)
    }, [inputValue])

    return (
        <div className="flex">
            <input
                className="z-10 bg-transparent border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                value={inputValue === emptyValue ? "" : inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value)
                    if (
                        showFirstRecommendation !==
                        (scrollWidth === e.target.scrollWidth)
                    )
                        setShowFirstRecommendation(
                            scrollWidth === e.target.scrollWidth
                        )
                }}
                onFocus={(e) => {
                    if (!scrollWidth) setScrollWidth(e.target.scrollWidth)
                    if (filteredRecommendations[0].startsWith("p_"))
                        setFirstRecommendation(
                            removePrefix(filteredRecommendations[0])
                        )
                    setListActive(true)
                }}
                onKeyDown={(e) => {
                    if (!listActive) return
                    if (e.key === "Enter" || e.key === "ArrowRight") {
                        if (
                            optionPointerIndex === -1 ||
                            filteredRecommendations[optionPointerIndex] ===
                                firstRecommendation
                        ) {
                            if (
                                e.target.selectionEnd ===
                                    e.target.value.length &&
                                firstRecommendation
                            ) {
                                setInputValue(
                                    removePrefix(filteredRecommendations[0])
                                )
                                setListActive(false)
                            }
                        } else {
                            setInputValue(
                                removePrefix(
                                    filteredRecommendations[optionPointerIndex]
                                )
                            )
                            setListActive(false)
                        }
                    } else if (e.key === "ArrowDown") {
                        if (filteredRecommendations.length === 0) return
                        const newIndex = optionPointerIndex + 1
                        if (filteredRecommendations.length <= newIndex) return

                        const el = optionsRef.current.children[newIndex]
                        if (el)
                            el.scrollIntoView({
                                block: "nearest",
                                inline: "nearest"
                            })
                        setOptionPointerIndex(newIndex)

                        const recommendationValue = filteredRecommendations[
                            newIndex
                        ].startsWith("p_")
                            ? inputValue +
                              removePrefix(
                                  filteredRecommendations[newIndex]
                              ).slice(inputValue.length)
                            : ""

                        setFirstRecommendation(recommendationValue)
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault()
                        if (filteredRecommendations.length === 0) return
                        const newIndex = optionPointerIndex - 1
                        if (newIndex < -1) return
                        setOptionPointerIndex(newIndex)
                        if (newIndex === -1) return

                        const el = optionsRef.current.children[newIndex]
                        if (el)
                            el.scrollIntoView({
                                block: "nearest",
                                inline: "nearest"
                            })

                        const recommendationValue = filteredRecommendations[
                            newIndex
                        ].startsWith("p_")
                            ? inputValue +
                              removePrefix(
                                  filteredRecommendations[newIndex]
                              ).slice(inputValue.length)
                            : ""

                        setFirstRecommendation(recommendationValue)
                    }
                }}
                onBlur={() => {
                    setFirstRecommendation("")
                    setOptionPointerIndex(-1)
                    setListActive(false)
                }}
            />
            <input
                value={showFirstRecommendation ? firstRecommendation : ""}
                readOnly
                className="text-opacity-40 absolute bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
            {listActive &&
                !(
                    filteredRecommendations.length === 1 &&
                    inputValue === firstRecommendation
                ) && (
                    <div
                        ref={optionsRef}
                        className="absolute bg-gray-700 border border-gray-500 rounded mt-8 z-10 max-h-48 overflow-auto"
                    >
                        {filteredRecommendations.map((type, index) => (
                            <div
                                key={index}
                                className={`p-1 cursor-pointer hover:bg-gray-600 text-left ${filteredRecommendations[optionPointerIndex] === type ? "text-red-200" : ""} ${type.startsWith("p_") ? "bg-green-200" : "bg-red-200"}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                    setInputValue(e.target.textContent)
                                }}
                            >
                                <HighlightMatches
                                    text={removePrefix(type)}
                                    search={inputValue}
                                    className={"font-bold"}
                                />
                            </div>
                        ))}
                    </div>
                )}
        </div>
    )
}
export { AutoCompleteInput, headerContentTypes }
