import { useContext, useState, useMemo, useEffect, useRef } from "react"
import { AppContext } from "./context"
import { Icon } from "./layout"
import { ClassNames, isEventInRect, d } from "core/helper"
import { HighlightMatches, useMounted, useExtractDimProps } from "./common"

function Button({
    name,
    onPressed,
    onPressedEnd,
    icon,
    value,
    activated,
    disabled,
    reverse,
    full,
    sized = true,
    colored = true,
    padded = true,
    styled = true,
    bordered = true,
    className,
    iconClassName,
    ...props
}) {
    const aContext = useContext(AppContext)
    const mounted = useMounted()
    const [clicked, setClicked] = useState(false)

    const style = useExtractDimProps(props)

    const cls = new ClassNames("", className)
    cls.addIf(styled && sized, "text-xs")
    cls.addIf(styled && padded, "py-0 px-2")
    cls.addIf(
        disabled,
        "opacity-50",
        styled
            ? "hover:brightness-110 focus:outline-none focus:ring focus:ring-focus-border"
            : ""
    )
    const isActive =
        (value === undefined && clicked) ||
        (value !== undefined && value === activated)

    cls.addIf(
        isActive && styled && colored,
        "bg-active-bg text-active-text" +
            (bordered ? " border-active-border" : "")
    )
    cls.addIf(
        !isActive && styled && colored,
        "bg-button-bg text-button-text" +
            (bordered ? " border-button-border" : "")
    )
    cls.addIf(styled && bordered, "border")
    const innerCls = new ClassNames("gap-1 justify-center")
    innerCls.addIf(reverse, "rstack-h", "stack-h")
    cls.addIf(full, "w-full")

    const iconCls = new ClassNames("not_leading-none", iconClassName)

    const initPressedHandling = (startEvent, releaseEvent) => {
        aContext.startExclusiveMode("clicked", "pointer")

        let btnElem = startEvent.target
        while (btnElem.nodeName !== "BUTTON") btnElem = btnElem.parentNode

        aContext.addEventListener(
            releaseEvent,
            (e) => {
                aContext.endExclusiveMode("clicked")
                if (!mounted.current) return

                setClicked(false)
                if (onPressedEnd) {
                    const outside =
                        releaseEvent !== "mouseup"
                            ? false
                            : !isEventInRect(e, btnElem.getBoundingClientRect())
                    onPressedEnd(outside)
                }
            },
            { once: true }
        )
        startEvent.stopPropagation()
        startEvent.preventDefault()
        setClicked(true)

        btnElem.focus()

        if (onPressed) onPressed(startEvent)
    }

    return (
        <button
            className={cls.value}
            disabled={disabled}
            style={style}
            onKeyDown={(e) => {
                if (e.keyCode !== 32 || clicked) {
                    return
                }
                initPressedHandling(e, "keyup")
            }}
            onMouseDown={(e) => initPressedHandling(e, "mouseup")}
        >
            <div className={innerCls.value}>
                {icon && <Icon className={iconCls.value} name={icon} />}
                {name && <div className="truncate">{name}</div>}
            </div>
        </button>
    )
}

const emptyValue = "<Enter Value>"

/**
 *
 * @param {*} recommendations Options of Autocomplete as an array
 * @returns
 */
function AutoCompleteInput({ defaultValue = "", suggestions = [], onClose }) {
    const [inputValue, setInputValue] = useState(defaultValue)
    const [firstRecommendation, setFirstRecommendation] = useState("")
    const [showFirstRecommendation, setShowFirstRecommendation] = useState(true)
    const [listActive, setListActive] = useState(false)
    const [optionPointerIndex, setOptionPointerIndex] = useState(-1)
    const [clientWidth, setClientWidth] = useState(null)
    const optionsRef = useRef(null)

    const removePrefix = (value) => {
        return value && typeof value === "string"
            ? value.replace(/p_|i_/g, "")
            : value
    }

    const value = removePrefix(inputValue)
    const lcValue = value.toLowerCase()

    const filteredSuggestions = useMemo(() => {
        const foundByPrefix = suggestions.filter((rec) => {
            const lcRec = rec.toLowerCase()
            return lcRec.startsWith(lcValue) && lcRec !== lcValue
        })
        const foundByIncludes = suggestions.filter((rec) => {
            const lcRec = rec.toLowerCase()
            return (
                !foundByPrefix.includes(rec) &&
                lcRec.includes(lcValue) &&
                lcRec !== lcValue
            )
        })
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
            filteredSuggestions.length > 0 &&
            !filteredSuggestions[0].startsWith("i_")
        ) {
            recommendation =
                value + removePrefix(filteredSuggestions[0]).slice(value.length)
        }
        if (inputValue !== "" || (inputValue === "" && listActive))
            setFirstRecommendation(recommendation)
        setOptionPointerIndex(-1)
        if (
            filteredSuggestions.length === 1 &&
            removePrefix(filteredSuggestions[0]) === value
        )
            setListActive(false)
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
                        (clientWidth === e.target.scrollWidth)
                    )
                        setShowFirstRecommendation(
                            clientWidth === e.target.scrollWidth
                        )
                }}
                onFocus={(e) => {
                    if (!clientWidth) setClientWidth(e.target.clientWidth)
                    if (
                        filteredSuggestions[0] &&
                        filteredSuggestions[0].startsWith("p_")
                    )
                        setFirstRecommendation(
                            removePrefix(filteredSuggestions[0])
                        )
                    setListActive(true)
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !listActive) {
                        //Hier benutzt er dann alle funktionen vom onBlur, sollte man vllt schöner lösen?
                        e.target.blur()
                    }
                    if (!listActive) return
                    if (e.key === "Enter" || e.key === "ArrowRight") {
                        if (e.key === "Enter") {
                            if (optionPointerIndex === -1) {
                                e.target.blur()
                                return
                            }
                        }
                        if (e.key === "ArrowRight") {
                            if (
                                showFirstRecommendation !==
                                (clientWidth === e.target.scrollWidth)
                            )
                                setShowFirstRecommendation(
                                    clientWidth === e.target.scrollWidth
                                )
                        }
                        if (
                            optionPointerIndex === -1 ||
                            filteredSuggestions[optionPointerIndex] ===
                                firstRecommendation
                        ) {
                            if (
                                e.target.selectionEnd ===
                                    e.target.value.length &&
                                firstRecommendation
                            ) {
                                setInputValue(
                                    removePrefix(filteredSuggestions[0])
                                )
                                setListActive(false)
                            }
                        } else {
                            setInputValue(
                                removePrefix(
                                    filteredSuggestions[optionPointerIndex]
                                )
                            )
                            setListActive(false)
                        }
                    } else if (e.key === "ArrowDown") {
                        if (filteredSuggestions.length === 0) return
                        const newIndex = optionPointerIndex + 1
                        if (filteredSuggestions.length <= newIndex) return

                        const el = optionsRef.current.children[newIndex]
                        if (el)
                            el.scrollIntoView({
                                block: "nearest",
                                inline: "nearest"
                            })
                        setOptionPointerIndex(newIndex)

                        const recommendationValue = filteredSuggestions[
                            newIndex
                        ].startsWith("p_")
                            ? inputValue +
                              removePrefix(filteredSuggestions[newIndex]).slice(
                                  inputValue.length
                              )
                            : ""

                        setFirstRecommendation(recommendationValue)
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault()
                        if (filteredSuggestions.length === 0) return
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

                        const recommendationValue = filteredSuggestions[
                            newIndex
                        ].startsWith("p_")
                            ? inputValue +
                              removePrefix(filteredSuggestions[newIndex]).slice(
                                  inputValue.length
                              )
                            : ""

                        setFirstRecommendation(recommendationValue)
                    }
                }}
                onBlur={() => {
                    setFirstRecommendation("")
                    setOptionPointerIndex(-1)
                    onClose(inputValue)
                    setInputValue("")
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
                    filteredSuggestions.length === 1 &&
                    inputValue === firstRecommendation
                ) && (
                    <div
                        ref={optionsRef}
                        className="absolute bg-gray-700 border border-gray-500 rounded mt-8 z-10 max-h-48 overflow-auto"
                    >
                        {filteredSuggestions.map((type, index) => (
                            <div
                                key={index}
                                className={`p-1 cursor-pointer hover:bg-gray-600 text-left ${filteredSuggestions[optionPointerIndex] === type ? "text-red-200" : ""} ${type.startsWith("p_") ? "bg-green-200" : "bg-red-200"}`}
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

function Select({
    className,
    options,
    defaultValue,
    onSelect = () => {},
    disabled = false
}) {
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
    return (
        <select
            className={cls.value}
            disabled={disabled}
            onChange={(e) => onSelect(e.target.value)}
            defaultValue={Object.keys(options).find(
                (option) => option === defaultValue
            )}
        >
            {elems}
        </select>
    )
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
