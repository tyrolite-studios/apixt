import { useContext, useState, useMemo, useEffect, useRef } from "react"
import { AppContext } from "./context"
import { Icon } from "./layout"
import { ClassNames, d } from "core/helper"
import { HighlightMatches } from "./common"

function Button({ name, onClick, icon, className }) {
    const aContext = useContext(AppContext)
    const [clicked, setClicked] = useState(false)

    const cls = new ClassNames(
        "text-xs border py-0 px-2 hover:brightness-110 focus:outline-none focus:ring focus:ring-focus-border",
        className
    )
    cls.addIf(
        clicked,
        "bg-active-bg text-active-text border-active-border",
        "bg-button-bg text-button-text border-button-border"
    )
    return (
        <button
            className={cls.value}
            onMouseDown={(e) => {
                aContext.startExclusiveMode("clicked", "pointer")
                aContext.addEventListener(
                    "mouseup",
                    (e) => {
                        aContext.endExclusiveMode("clicked")
                        setClicked(false)
                        onClick()
                    },
                    { once: true }
                )
                e.stopPropagation()
                e.preventDefault()
                setClicked(true)
            }}
        >
            <div className="stack-h gap-1">
                {name && <div>{name}</div>}
                {icon && <Icon name={icon} />}
            </div>
        </button>
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
    const emptyValue = "<Enter Value>"

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

function ButtonGroup({ className, children }) {
    const cls = new ClassNames("stack-h gap-2", className)
    return <div className={cls.value}>{children}</div>
}

// dummy input elems...

function Input({ id, name, set, value, type = "text", className }) {
    const cls = new ClassNames(
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-2",
        className
    )
    return (
        <input
            id={id}
            value={value}
            onChange={(e) => set(e.target.value)}
            name={name}
            type={type}
            className={cls.value}
        />
    )
}

function TextArea({ className, value }) {
    const cls = new ClassNames(
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border resize-none px-2",
        className
    )
    return <textarea className={cls.value}>{value}</textarea>
}

function Select({ className, options }) {
    const cls = new ClassNames(
        "text-sm text-input-text hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-2",
        className
    )
    const elems = []
    for (const [id, name] of Object.entries(options)) {
        elems.push(
            <option key={id} value={id}>
                {name}
            </option>
        )
    }
    return <select className={cls.value}>{elems}</select>
}

function Checkbox({ value, set, className }) {
    const cls = new ClassNames(
        "checked:bg-active-bg text-sm text-input-text bg-input-bg hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border bg-input-bg border border-input-border px-1",
        className
    )
    return (
        <input
            type="checkbox"
            value={value}
            onChange={(e) => {
                set(!value)
            }}
            checked={value}
            className={cls.value}
        />
    )
}

function Radio({}) {}

export {
    Button,
    ButtonGroup,
    Input,
    TextArea,
    Select,
    Radio,
    Checkbox,
    AutoCompleteInput
}
