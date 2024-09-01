import { useContext, useState, useMemo, useEffect, useRef } from "react"
import { AppContext } from "./context"
import { Icon, Div } from "./layout"
import {
    ClassNames,
    isEventInRect,
    isInt,
    d,
    isString,
    isNull,
    isBool,
    isInRange
} from "core/helper"
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
    invalid,
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
    cls.addIf(invalid, "invalid")

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

        if (onPressed) onPressed(startEvent, { activated })
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

function ButtonGroup({
    className,
    children,
    gapped = true,
    wrap = true,
    ...props
}) {
    const style = useExtractDimProps(props)

    const cls = new ClassNames("stack-h", className)
    cls.addIf(gapped, "gap-2")
    cls.addIf(wrap, "flex-wrap", "flex-nowrap overflow-auto")

    return (
        <div tabIndex={0} className={cls.value} style={style}>
            {children}
        </div>
    )
}

function Input({
    id,
    name,
    set,
    value,
    type = "text",
    readOnly,
    disabled,
    full,
    size,
    keys,
    required,
    minLength,
    maxLength,
    isValid = () => true,
    sized = true,
    bordered = true,
    colored = true,
    padded = true,
    styled = true,
    className,
    ...props
}) {
    const style = useExtractDimProps(props)
    const interactive = !(readOnly || disabled)

    const checkValidity = (value) => {
        return !(
            !isString(value) ||
            (maxLength && value.length > maxLength) ||
            (minLength && value.length < minLength) ||
            (required && value.length === 0) ||
            !isValid(value)
        )
    }
    const [tmpValue, setTmpValue] = useState(value)
    const invalid = !checkValidity(tmpValue)

    useEffect(() => {
        if (invalid || tmpValue === value || !isString(value)) return

        setTmpValue(value)
    }, [value])

    const cls = new ClassNames("", className)
    cls.addIf(full, "w-full")
    cls.addIf(styled && sized, "text-sm")
    cls.addIf(styled && padded, "px-2")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && colored, "text-input-text bg-input-bg")
    cls.addIf(invalid, "invalid")
    cls.addIf(styled && colored && bordered, "border-input-border")
    cls.addIf(
        !disabled,
        "hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border"
    )
    cls.addIf(disabled, "opacity-50")

    let onKeyDown = null
    if (interactive) {
        onKeyDown = !keys
            ? props.onKeyDown
            : (e) => {
                  if (props.onKeyDown) props.onKeyDown(e)

                  const key = e.key === "Space" ? " " : e.key
                  if (key.length === 1 && keys.indexOf(key) === -1) {
                      e.preventDefault()
                  }
              }
    }
    return (
        <input
            id={id}
            disabled={disabled}
            value={isString(tmpValue) ? tmpValue : ""}
            onKeyDown={onKeyDown}
            onChange={
                !interactive
                    ? null
                    : (e) => {
                          setTmpValue(e.target.value)
                          if (checkValidity(e.target.value)) {
                              set(e.target.value)
                          }
                      }
            }
            onBlur={(e) => {
                if (invalid) setTmpValue(value)
            }}
            name={name}
            type={type}
            size={size}
            required={required}
            maxLength={maxLength}
            minLength={minLength}
            readOnly={!interactive}
            className={cls.value}
            style={style}
        />
    )
}

function Number({ min, max, value, set, size, ...props }) {
    const setTmp = (value) => {
        set(parseInt(value))
    }
    const tmpValue = isInt(value) ? "" + value : ""
    const isValid = (value) => {
        if (!isString(value)) return false

        if (!/^-?\d+$/.test(value)) return false

        const parsed = parseInt(value)
        if (isNaN(parsed)) return false

        if (
            (min !== undefined && parsed < min) ||
            (max !== undefined && parsed > max)
        )
            return false

        return true
    }
    let maxLength = 0
    let keys = "0123456789"
    let subZero = min === undefined && max === undefined
    if (min !== undefined) {
        maxLength = ("" + min).length
        if (min < 0) subZero = true
    }
    if (max !== undefined) {
        maxLength = Math.max(maxLength, ("" + max).length)
        if (max < 0) subZero = true
    }
    if (subZero) keys += "-"
    if (maxLength === 0) maxLength = 11
    return (
        <Input
            value={tmpValue}
            set={setTmp}
            isValid={isValid}
            keys={keys}
            onKeyDown={(e) => {
                if (!isInt(value)) return

                let delta = 0
                if (e.key === "ArrowUp") {
                    delta++
                } else if (e.key === "ArrowDown") {
                    delta--
                }
                if (delta === 0) return

                const newValue = value + delta
                if (!isInRange(newValue, min, max)) return
                setTmp("" + newValue)
                e.preventDefault()
            }}
            maxLength={maxLength}
            size={size === undefined ? maxLength : size}
            {...props}
        />
    )
}

function Textarea({
    value,
    set,
    disabled,
    readOnly,
    required,
    full,
    minLength,
    maxLength,
    cols,
    rows,
    isValid = () => true,
    styled = true,
    sized = true,
    padded = true,
    bordered = true,
    colored = true,
    className,
    ...props
}) {
    const checkValidity = (value) => {
        return !(
            !isString(value) ||
            (maxLength && value.length > maxLength) ||
            (minLength && value.length < minLength) ||
            (required && value.length === 0) ||
            !isValid(value)
        )
    }
    const [tmpValue, setTmpValue] = useState(value)
    const invalid = !checkValidity(tmpValue)

    useEffect(() => {
        if (invalid || tmpValue === value || !isString(value)) return

        setTmpValue(value)
    }, [value])

    const style = useExtractDimProps(props)
    const cls = new ClassNames("resize-none", className)
    cls.addIf(full, "w-full")
    cls.addIf(styled && sized, "text-sm")
    cls.addIf(styled && padded, "px-2")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && colored, "text-input-text bg-input-bg")
    cls.addIf(invalid, "invalid")
    cls.addIf(styled && colored && bordered, "border-input-border")
    cls.addIf(
        !disabled,
        "hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border"
    )
    cls.addIf(disabled, "opacity-50")

    return (
        <textarea
            className={cls.value}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            style={style}
            cols={cols}
            rows={rows}
            onBlur={(e) => {
                if (invalid) setTmpValue(value)
            }}
            onChange={(e) => {
                const newValue = e.target.value
                setTmpValue(newValue)
                if (checkValidity(newValue)) {
                    set(newValue)
                }
            }}
            value={isString(tmpValue) ? tmpValue : ""}
        />
    )
}

function Select({
    value,
    set,
    readOnly,
    required,
    full,
    empty,
    styled = true,
    sized = true,
    padded = true,
    bordered = true,
    colored = true,
    options = [],
    disabled = false,
    className,
    ...props
}) {
    const ids = options.map((option) => option.id)
    const isIntValue = ids.length && ids.every((id) => isInt(id))
    const isEmpty = value === "" || value === null
    let tmpValue = isEmpty ? null : value
    if (isIntValue && !(empty && isEmpty)) {
        tmpValue = parseInt(value)
    }
    const style = useExtractDimProps(props)
    const cls = new ClassNames("resize-none", className)
    cls.addIf(full, "w-full")
    cls.addIf(styled && sized, "text-sm")
    cls.addIf(styled && padded, "px-2")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && colored, "text-input-text bg-input-bg")
    cls.addIf(styled && colored && bordered, "border-input-border")
    cls.addIf(
        !disabled,
        "hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border"
    )
    cls.addIf(disabled, "opacity-50")
    const elems = []
    let hasFound = false

    for (const { id, name } of options) {
        const found = id == tmpValue
        if (found) hasFound = true
        elems.push(
            <option key={id} checked={found} value={id}>
                {name}
            </option>
        )
    }
    let invalid =
        options.length > 0 && !(ids.includes(tmpValue) || (empty && isEmpty))

    if (empty) {
        const found = isNull(tmpValue)
        if (found) hasFound = true
        elems.unshift(
            <option key="" checked={tmpValue === null} value=""></option>
        )
    }
    if (!hasFound) {
        if (!empty) {
            elems.unshift(
                <option key="" checked={true} value={null}>
                    Please select...
                </option>
            )
        }
        if (value !== undefined && !empty) invalid = true
    }
    cls.addIf(invalid, "invalid")
    return (
        <select
            className={cls.value}
            disabled={disabled}
            required={required}
            defaultValue={readOnly || disabled ? tmpValue : null}
            onMouseDown={readOnly ? (e) => e.preventDefault() : null}
            onChange={(e) => {
                let value = e.target.value
                if (empty && value === "") {
                    value = null
                } else if (isInt) {
                    value = parseInt(e.target.value)
                }
                set(value)
            }}
            style={style}
        >
            {elems}
        </select>
    )
}

function Checkbox({
    value,
    set,
    disabled,
    sized = true,
    bordered = true,
    colored = true,
    styled = true,
    readOnly,
    className
}) {
    const [clicked, setClicked] = useState(false)

    let tmpValue = value
    if (isString(value)) {
        if (["true", "false"].includes(value.toLowerCase())) {
            tmpValue = value.toLowerCase() === "true"
        } else if (["0", "1"].includes(value)) {
            tmpValue = value === "1"
        }
    }
    const invalid = !isBool(tmpValue)
    const interactive = !(readOnly || disabled)
    const aCtx = useContext(AppContext)
    const cls = new ClassNames("select-none", className)
    cls.addIf(styled && sized, "text-xs")
    cls.addIf(styled && bordered, "border")
    cls.addIf(
        clicked,
        styled && colored ? "text-active-text bg-active-bg" : "",
        styled && colored ? "text-input-text bg-input-bg" : ""
    )
    cls.addIf(styled && colored && bordered, "border-input-border")
    cls.addIf(
        styled && !disabled,
        "hover:brightness-110 focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border"
    )
    cls.addIf(disabled, "opacity-50")
    cls.addIf(invalid, "invalid")

    const handleClick = (upEvent) => {
        aCtx.startExclusiveMode("toggle-bool", "pointer")
        aCtx.addEventListener(
            upEvent,
            () => {
                aCtx.endExclusiveMode("toggle-bool")
                setClicked(false)
            },
            { once: true }
        )
        set(invalid ? true : !tmpValue)
        setClicked(true)
    }
    const iconCls = new ClassNames("not_leading-none")
    iconCls.addIf(value, "visible", "invisible")
    return (
        <Div
            tab={!disabled}
            cursor={interactive ? "pointer" : null}
            width="min-content"
            height="min-content"
            className={cls.value}
            onMouseDown={!interactive ? null : () => handleClick("mouseup")}
            onKeyDown={
                !interactive
                    ? null
                    : (e) => {
                          const isSpace = e.keyCode === 32
                          if (!isSpace) return

                          e.preventDefault()
                          if (!clicked) handleClick("keyup")
                      }
            }
        >
            <Icon className={iconCls.value} name="check" />
        </Div>
    )
}

function Radio({
    value,
    set,
    disabled,
    readOnly,
    buttonProps = {},
    options = [],
    ...props
}) {
    const ids = options.map((option) => option.id)
    const invalid = !ids.includes(value)

    const elems = []
    for (const { id, name } of options) {
        elems.push(
            <Button
                {...buttonProps}
                key={id}
                name={name}
                invalid={invalid}
                disabled={disabled}
                onPressed={readOnly ? null : () => set(id)}
                value={value}
                activated={id}
            />
        )
    }
    return <ButtonGroup {...props}>{elems}</ButtonGroup>
}

function Slider({}) {
    return <div>Slider</div>
}

function FormGrid({ className, children, ...props }) {
    const cls = new ClassNames(
        "grid grid-cols-[max-content_auto] gap-2",
        className
    )

    return (
        <div className={cls.value} {...props}>
            {children}
        </div>
    )
}

function SectionCells({ name }) {
    return (
        <div className="col-span-2 text-sm pt-2 border-b border-app-text">
            {name}
        </div>
    )
}

function CustomCells({ name, children }) {
    return (
        <>
            <div className="text-xs px-2">{name}</div>
            <div>{children}</div>
        </>
    )
}

function CheckboxCells({ name, ...props }) {
    return (
        <CustomCells name={name}>
            <Checkbox {...props} />
        </CustomCells>
    )
}

function InputCells({ name, ...props }) {
    return (
        <CustomCells name={name}>
            <Input {...props} />
        </CustomCells>
    )
}

function NumberCells({ name, ...props }) {
    return (
        <CustomCells name={name}>
            <Number {...props} />
        </CustomCells>
    )
}

function TextareaCells({ name, ...props }) {
    return (
        <CustomCells name={name}>
            <Textarea {...props} />
        </CustomCells>
    )
}

function SelectCells({ name, ...props }) {
    return (
        <CustomCells name={name}>
            <Select {...props} />
        </CustomCells>
    )
}

function RadioCells({ name, ...props }) {
    return (
        <CustomCells name={name}>
            <Radio {...props} />
        </CustomCells>
    )
}

export {
    Button,
    ButtonGroup,
    Input,
    Number,
    Textarea,
    Select,
    Radio,
    Checkbox,
    Slider,
    AutoCompleteInput,
    FormGrid,
    SectionCells,
    CustomCells,
    CheckboxCells,
    InputCells,
    NumberCells,
    TextareaCells,
    SelectCells,
    RadioCells
}
