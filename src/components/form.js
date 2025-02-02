import {
    useContext,
    createContext,
    useState,
    useMemo,
    useEffect,
    useRef
} from "react"
import { AppContext } from "./context"
import {
    Icon,
    Div,
    Stack,
    Overlays,
    Overlay,
    AvailContext,
    AvailContextProvider
} from "./layout"
import {
    ClassNames,
    isEventInRect,
    isInt,
    d,
    clamp,
    round,
    isString,
    isNull,
    isBool,
    isNumber,
    isInRange,
    rgb2hex
} from "core/helper"
import {
    HighlightMatches,
    ColorBox,
    useMounted,
    useExtractDimProps,
    useGetAttrWithDimProps,
    useGetTabIndex,
    useFocusManager,
    useMarkInvalid,
    useManagedContainer,
    useItemFocusOnContainer
} from "./common"

function useFocusKeyBindings({ keyHandlers = [], disabled = false, direct }) {
    const [hasFocus, setHasFocus] = useState(false)

    const attr = {}

    if (!disabled) {
        attr.onFocus = () => {
            setHasFocus(true)
        }
        attr.onBlur = () => {
            setHasFocus(false)
        }
        if (hasFocus) {
            attr.onKeyDown = (e) => {
                for (let item of keyHandlers) {
                    if (item.keys && item.keys.includes(e.key)) {
                        item.handler(e)
                        break
                    }
                }
            }
        }
        if (direct) {
            attr.tab = true
        }
    }
    return attr
}

function Checkbox({
    value,
    set,
    disabled,
    autoFocus,
    tab = true,
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
    const aContext = useContext(AppContext)
    const cls = new ClassNames(
        "select-none focus:ring focus:ring-offset-0 focus:ring-focus-border",
        className
    )
    cls.addIf(styled && sized, "text-xs")
    cls.addIf(styled && bordered, "border")
    cls.addIf(
        clicked,
        styled && colored ? "text-active-text bg-active-bg" : "",
        styled && colored ? "text-input-text bg-input-bg" : ""
    )
    cls.addIf(styled && colored && bordered, "border-input-border")
    cls.addIf(styled && interactive, "hover:brightness-110 focus:outline-none")
    cls.addIf(disabled, "opacity-50")
    useMarkInvalid(cls, invalid)
    cls.addIf(autoFocus, "autofocus")

    const handleClick = (source, upEvent) => {
        aContext.startExclusiveMode(`${source}:toggle-bool`, "pointer")
        aContext.addEventListener(
            upEvent,
            () => {
                aContext.endExclusiveMode(`${source}:toggle-bool`)
                setClicked(false)
            },
            { once: true }
        )
        set(invalid ? true : !tmpValue)
        setClicked(true)
    }
    const iconCls = new ClassNames("not_leading-none")
    iconCls.addIf(value === true, "visible", "invisible")
    const attr = {}
    attr.tabIndex = useGetTabIndex({ tab }, cls)
    return (
        <Div
            cursor={interactive ? "pointer" : null}
            width="min-content"
            height="min-content"
            className={cls.value}
            onMouseDown={
                !interactive
                    ? (e) => {
                          if (!disabled) return
                          e.preventDefault()
                      }
                    : () => handleClick("mouse", "mouseup")
            }
            onKeyDown={(e) => {
                const isSpace = e.keyCode === 32
                if (!isSpace) return

                e.preventDefault()
                if (interactive && !clicked) handleClick("key", "keyup")
            }}
            {...attr}
        >
            <Icon className={iconCls.value} name="check" />
        </Div>
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
    autoFocus,
    onMouseDown,
    tab = true,
    isValid = () => true,
    sized = true,
    bordered = true,
    colored = true,
    padded = true,
    styled = true,
    className,
    ...props
}) {
    const aContext = useContext(AppContext)
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
    const lastValue = useRef(value)
    if (value !== lastValue.current) {
        if (value !== tmpValue) {
            setTmpValue(value)
        }
        lastValue.current = value
    }
    const invalid = !checkValidity(tmpValue)

    useEffect(() => {
        if (invalid || tmpValue === value || !isString(value)) return

        setTmpValue(value)
    }, [value])

    const cls = new ClassNames(
        "focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border",
        className
    )
    cls.addIf(full, "w-full")
    cls.addIf(styled && sized, "text-sm")
    cls.addIf(styled && padded, "px-dix py-diy")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && colored, "text-input-text bg-input-bg")
    useMarkInvalid(cls, invalid)

    cls.addIf(styled && colored && bordered, "border-input-border")
    cls.addIf(interactive, "hover:brightness-110")
    cls.addIf(disabled, "opacity-50")
    cls.addIf(autoFocus, "autofocus")

    const attr = useGetAttrWithDimProps(props)
    attr.tabIndex = useGetTabIndex({ tab }, cls)
    if (!interactive) attr.style.cursor = "default"

    let onKeyDown = null
    if (interactive) {
        onKeyDown = (e) => {
            if (aContext.isInExclusiveMode()) {
                e.preventDefault()
                return
            }
            if (props.onKeyDown) props.onKeyDown(e)

            if (!keys) return

            const key = e.key === "Space" ? " " : e.key
            if (key.length === 1 && keys.indexOf(key) === -1) {
                e.preventDefault()
            }
        }
    }
    return (
        <input
            id={id}
            value={isString(tmpValue) ? tmpValue : ""}
            onKeyDown={onKeyDown}
            onMouseDown={
                !interactive
                    ? (e) => {
                          e.preventDefault()
                      }
                    : onMouseDown
            }
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
            {...attr}
        />
    )
}

function Number({ min, max, value, set, size, readOnly, disabled, ...props }) {
    const interactive = !(readOnly || disabled)
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
            disabled={disabled}
            readOnly={readOnly}
            keys={keys}
            onKeyDown={(e) => {
                if (interactive && isInt(value)) {
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
                }
                if (["ArrowUp", "ArrowDown"].includes(e.key)) {
                    e.preventDefault()
                }
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
    autoFocus,
    onMouseDown,
    tab = true,
    isValid = () => true,
    styled = true,
    sized = true,
    padded = true,
    bordered = true,
    colored = true,
    className,
    ...props
}) {
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
    const lastValue = useRef(value)
    if (value !== lastValue.current) {
        if (value !== tmpValue) {
            setTmpValue(value)
        }
        lastValue.current = value
    }
    const invalid = !checkValidity(tmpValue)

    useEffect(() => {
        if (invalid || tmpValue === value || !isString(value)) return

        setTmpValue(value)
    }, [value])

    const style = useExtractDimProps(props)
    const cls = new ClassNames(
        "resize-none focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border",
        className
    )
    cls.addIf(full, "w-full")
    cls.addIf(styled && sized, "text-sm")
    cls.addIf(styled && padded, "px-2")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && colored, "text-input-text bg-input-bg")
    useMarkInvalid(cls, invalid)
    cls.addIf(styled && colored && bordered, "border-input-border")
    cls.addIf(interactive, "hover:brightness-110")
    cls.addIf(disabled, "opacity-50 caret-transparent")
    cls.addIf(autoFocus, "autofocus")
    const attr = useGetAttrWithDimProps(props)
    attr.tabIndex = useGetTabIndex({ tab }, cls)
    if (!interactive) {
        attr.style.cursor = "default"
    }
    return (
        <textarea
            className={cls.value}
            readOnly={readOnly}
            required={required}
            style={style}
            cols={cols}
            rows={rows}
            onBlur={(e) => {
                if (invalid) setTmpValue(value)
            }}
            onMouseDown={
                !interactive
                    ? (e) => {
                          e.preventDefault()
                      }
                    : onMouseDown
            }
            onChange={(e) => {
                if (!interactive) return

                const newValue = e.target.value
                setTmpValue(newValue)
                if (checkValidity(newValue)) {
                    set(newValue)
                }
            }}
            value={isString(tmpValue) ? tmpValue : ""}
            {...attr}
        />
    )
}

function Select({
    value,
    set,
    readOnly,
    disabled,
    required,
    full,
    empty,
    emptyMsg,
    autoFocus,
    onMouseDown,
    onKeyDown,
    tab = true,
    styled = true,
    sized = true,
    padded = true,
    bordered = true,
    colored = true,
    options = [],
    className,
    ...props
}) {
    const interactive = !(readOnly || disabled)
    const ids = options.map((option) => option.id)
    const isIntValue = ids.length && ids.every((id) => isInt(id))
    const isEmpty = value === "" || value === null
    let tmpValue = isEmpty ? null : value
    if (isIntValue && !(empty && isEmpty)) {
        tmpValue = parseInt(value)
    }
    const attr = useGetAttrWithDimProps(props)
    const cls = new ClassNames(
        "resize-none focus:outline-none focus:ring focus:ring-offset-0 focus:ring-focus-border",
        className
    )
    cls.addIf(full, "w-full")
    cls.addIf(styled && sized, "text-sm")
    cls.addIf(styled && padded, "px-2")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && colored, "text-input-text bg-input-bg")
    cls.addIf(styled && colored && bordered, "border-input-border")
    cls.addIf(interactive, "hover:brightness-110")
    cls.addIf(disabled, "opacity-50")
    cls.addIf(autoFocus, "autofocus")
    const elems = []
    let hasFound = false

    for (const { id, name } of options) {
        const found = id == tmpValue
        if (found) hasFound = true
        elems.push(
            <option key={id} value={id}>
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
            <option key="" checked={tmpValue === null} value="">
                {emptyMsg}
            </option>
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
    useMarkInvalid(cls, invalid)

    attr.tabIndex = useGetTabIndex({ tab }, cls)
    if (!interactive) {
        attr.style.cursor = "default"
    }

    return (
        <select
            className={cls.value}
            required={required}
            value={tmpValue === null ? "" : tmpValue}
            onMouseDown={!interactive ? (e) => e.preventDefault() : onMouseDown}
            onKeyDown={
                !interactive
                    ? (e) => {
                          if (["ArrowDown", "ArrowUp", " "].includes(e.key)) {
                              e.preventDefault()
                          }
                      }
                    : onKeyDown
            }
            onChange={(e) => {
                let value = e.target.value
                if (empty && value === "") {
                    value = null
                } else if (isIntValue) {
                    value = parseInt(e.target.value)
                }
                set(value)
            }}
            {...attr}
        >
            {elems}
        </select>
    )
}

function Radio({
    value,
    set,
    disabled,
    readOnly,
    tab = true,
    buttonProps = {},
    options = [],
    autoFocus,
    ...props
}) {
    const interactive = !(readOnly || disabled)
    const ids = options.map((option) => option.id)
    const invalid = !ids.includes(value)

    const buttons = []
    let index = 0
    let i = 0
    for (const { id, name } of options) {
        const found = !invalid && id === value
        buttons.push({
            name,
            tab,
            invalid,
            autoFocus: !autoFocus ? null : true,
            disabled,
            colored: invalid || found,
            className:
                invalid || found
                    ? ""
                    : "bg-input-bg text-input-text border-input-border",
            readOnly,
            onPressed: !interactive ? null : () => set(id),
            value,
            activated: id
        })
        if (found) index = id //i
        i++
    }
    d(buttons, options)
    return (
        <ButtonGroup
            active={d(invalid ? 0 : index, "active")}
            {...props}
            buttons={d(buttons, "buttons")}
        />
    )
}

function Picker({
    className,
    itemClassName,
    options = [],
    renderer = (item) => (isString(item) ? item : item.name),
    pick = () => {},
    full,
    wrap = true,
    bordered = true,
    divided = true,
    padded = true,
    sized = true,
    colored = true,
    styled = true,
    ...props
}) {
    const cls = new ClassNames("stack-v overflow-y-auto", className)
    cls.addIf(styled && colored, "bg-input-bg text-input-text")
    cls.addIf(styled && bordered, "border")
    cls.addIf(styled && bordered && colored, "border-input-border")
    cls.addIf(styled && divided, "divide-y")
    cls.addIf(styled && divided && colored, "divide-input-border")
    const stackRef = useRef(null)
    const setActive = (index) => {
        const option = options[index]
        pick(option)
    }
    const { focusItem, hasFocus, attr, tabIndex, ...focus } = useFocusManager({
        setActive,
        active: 0,
        divRef: stackRef,
        count: options.length,
        handleSpace: true
    })
    const divAttr = useGetAttrWithDimProps(props)
    cls.addIf(!divAttr.style?.width && !full, "max-w-max")
    cls.addIf(full, "w-full")
    cls.addIf(!wrap, "text-nowrap")

    const elems = []
    let i = 0
    for (const option of options) {
        const isFocused = hasFocus && i === tabIndex

        const itemCls = new ClassNames(
            "hover:brightness-110 focus:outline-none focus:ring focus:ring-inset focus:ring-focus-border focus:border-0",
            itemClassName
        )
        itemCls.addIf(styled && sized, "text-sm")
        itemCls.addIf(styled && padded, "p-2")
        itemCls.addIf(!wrap, "truncate")
        if (styled && colored) {
            itemCls.addIf(
                isFocused,
                "bg-active-bg text-active-text",
                "bg-input-bg text-input-text"
            )
        }
        const itemAttr = focus.itemAttr(i)
        itemAttr.style = {
            cursor: "pointer"
        }
        if (isFocused) {
            itemAttr.style.zIndex = 40
        }
        elems.push(
            <Div key={i} className={itemCls.value} {...itemAttr}>
                {renderer(option)}
            </Div>
        )
        i++
    }
    return (
        <div ref={stackRef} className={cls.value} {...attr} {...divAttr}>
            {elems}
        </div>
    )
}

function Color({
    value,
    set,
    readOnly,
    disabled,
    alpha,
    padded = true,
    bordered = true,
    colored = true,
    styled = true,
    tab = true,
    className,
    innerClassName
}) {
    const aContext = useContext(AppContext)

    const colorRef = useRef(null)
    const [clicked, setClicked] = useState(false)

    const interactive = !(readOnly || disabled)
    // const { openColorPickerModal, ColorPickerModal } = useColorPickerModal()
    colorRef.current = value

    const cls = new ClassNames(
        "max-w-max focus:outline-none focus:ring focus:ring-focus-border",
        className
    )
    cls.addIf(styled && padded, "p-1")
    cls.addIf(styled && bordered, "border border-outset")
    cls.addIf(styled && colored, "bg-input-bg")
    cls.addIf(styled && bordered && colored, "border-input-border")

    const invalid = typeof value !== "string" //||
    //!value.match(alpha ? /^#[0-9a-f]{8}$/i : /^#[0-9a-f]{6}$/i)
    useMarkInvalid(cls, invalid)

    const innerCls = new ClassNames("", innerClassName)
    innerCls.addIf(styled && bordered, "border border-inset")
    innerCls.addIf(styled && bordered && colored, "border-input-border")
    innerCls.addIf(styled && colored, "bg-input-bg")
    cls.addIf(disabled, "opacity-50")
    cls.addIf(interactive, "hover:brightness-110")
    const handleClick = (source, upEvent) => {
        if (invalid) {
            colorRef.current = "#000000" + (alpha ? "00" : "")
        }
        const mode = `${source}:pick-color`
        aContext.startExclusiveMode(mode, "pointer")
        aContext.addEventListener(
            upEvent,
            () => {
                aContext.endExclusiveMode(mode)
                setClicked(false)
            },
            { once: true }
        )
        d("TODO open colorpicker with ", value)
        /*
        openColorPickerModal({
            value: colorRef,
            alpha,
            set
        })
        */
        setClicked(true)
        if (invalid && set) set(colorRef.current)
    }
    const width = 30
    const height = 13
    return (
        <Div
            className={cls.value}
            cursor={!interactive ? false : "pointer"}
            tab={tab}
            onMouseDown={
                !interactive
                    ? (e) => e.preventDefault()
                    : () => handleClick("mouse", "mouseup")
            }
            onKeyDown={
                readOnly
                    ? null
                    : (e) => {
                          if (e.keyCode !== 32 || clicked) {
                              return
                          }
                          e.preventDefault()
                          if (interactive) handleClick("key", "keyup")
                      }
            }
        >
            <div className={innerCls.value}>
                <ColorBox
                    color={invalid ? "#FFFFFF00" : rgb2hex(value)}
                    width={width}
                    height={height}
                />
            </div>
        </Div>
    )
}

// TODO refactor this crap
function SliderBounds({
    vertical,
    min,
    max,
    full,
    end,
    center,
    width,
    height,
    padded,
    border,
    children
}) {
    const defaultPaddingPx = 2
    const boxBorderWidthPx = 1
    const add = {
        h: 0,
        v: 0
    }
    if (padded) {
        if (padded === "1") {
            add.h += 2
            add.v += 2
        } else {
            if (typeof padded === "number") {
                if (padded & DIR.LEFT) add.h++
                if (padded & DIR.RIGHT) add.h++
                if (padded & DIR.TOP) add.v++
                if (padded & DIR.BOTTOM) add.v++
            } else {
                if (padded !== "v") add.h = 2
                if (padded !== "h") add.v = 2
            }
            add.h *= defaultPaddingPx
            add.v *= defaultPaddingPx
        }
    }
    if (border) {
        if (border === "1") {
            add.h += 2
            add.v += 2
        } else if (typeof border === "number") {
            let h = 0
            let v = 0
            if (border & DIR.TOP) v++
            if (border & DIR.BOTTOM) v++
            if (border & DIR.LEFT) h++
            if (border & DIR.RIGHT) h++
            add.h += h * boxBorderWidthPx
            add.v += v * boxBorderWidthPx
        } else {
            add.h += 2 * boxBorderWidthPx
            add.v += 2 * boxBorderWidthPx
        }
    }
    if (width) width += add.h
    if (height) height += add.v

    const dimProps = {}
    const style = { width, height }
    const axisDir = vertical ? "v" : "h"
    full = full && full !== axisDir ? true : axisDir
    const axisDim = vertical ? "Height" : "Width"
    if (min) {
        style["min" + axisDim] = min + add[axisDir]
    }
    if (max) {
        style["max" + axisDim] = max + add[axisDir]
    }
    if (end) {
        dimProps.className = "" //"margin-" + (vertical ? "top" : "left") + "-auto"
    } else if (true || center) {
        dimProps.className = "" // "margin-" + (vertical ? "v" : "h") + "-auto"
    }
    if (full) dimProps.className = "w-full"
    return (
        <Div {...dimProps} style={style}>
            <AvailContextProvider>{children}</AvailContextProvider>
        </Div>
    )
}

function Slider({
    vertical,
    center,
    end,
    padded,
    border,
    size,
    full,
    tab = true,
    sledProps = {},
    railProps = {},
    ...props
}) {
    const buttonBorderWidthPx = 1

    railProps = {
        size: 150,
        radius: true,
        oppSize: 8,
        minSize: 80,
        maxSize: 180,
        outline: false,
        center: true,
        ...railProps
    }
    sledProps = {
        border: true,
        short: 10,
        long: 25,
        margin: 0,
        radius: true,
        ...sledProps
    }
    if (size) {
        railProps.size = size
        railProps.minSize = size
        railProps.maxSize = size
    }
    let borders = 0
    if (sledProps.border) {
        borders = sledProps.border === "1" ? 1 : buttonBorderWidthPx
    }
    const min =
        railProps.minSize === null
            ? false
            : railProps.minSize + sledProps.short + 2 * buttonBorderWidthPx
    let max =
        railProps.maxSize === null
            ? false
            : railProps.maxSize + sledProps.short + 2 * buttonBorderWidthPx
    const attr = {
        full: vertical ? "v" : "h",
        [vertical ? "width" : "height"]:
            sledProps.margin + sledProps.long + 2 * borders
    }
    return (
        <SliderBounds
            vertical={vertical}
            padded={padded}
            end={end}
            center={center}
            min={min}
            max={max}
            border={border}
            {...attr}
        >
            <SliderInner
                end={end}
                center={center}
                vertical={vertical}
                tab={tab}
                {...props}
                borders={borders}
                railProps={railProps}
                sledProps={sledProps}
            />
        </SliderBounds>
    )
}

function SliderInner({
    vertical,
    sledProps,
    railProps,
    borders,
    end,
    ...props
}) {
    const avContext = useContext(AvailContext)
    const axisDim = vertical ? "height" : "width"
    railProps.size = clamp(
        railProps.minSize,
        avContext[axisDim] - (sledProps.short - 2 * borders),
        railProps.maxSize
    )
    return (
        <RailAndSled
            vertical={vertical}
            sledProps={sledProps}
            railProps={railProps}
            borders={borders}
            {...props}
        />
    )
}

function RailAndSled({
    value,
    set,
    vertical,
    min = 0,
    max,
    tab,
    readOnly,
    disabled,
    decimals = 0,
    railProps = {},
    sledProps = {},
    getIndicator,
    borders,
    focusRef,
    children
}) {
    const aContext = useContext(AppContext)

    const [clicked, setClicked] = useState(false)

    const divRef = useRef(null)
    const sledRef = useRef(null)
    const propsRef = useRef(null)
    propsRef.current = { value }

    const interactive = !(readOnly || disabled)

    const {
        oppSize,
        size,
        minSize,
        maxSize,
        outline,
        center,
        radius: railRadius
    } = railProps
    const { border, short, long, margin, radius } = sledProps

    const cls = new ClassNames("overflow")
    const stackCls = new ClassNames()

    stackCls.addIf(true || outline, "ring-1 ring-input-border")
    const sledBorders = 2 * borders
    const sledShort = short + sledBorders
    const sledLong = long + sledBorders + margin

    const clampedSize = clamp(minSize, size, maxSize)
    let interval = Math.abs(max - min)
    let points = interval
    let i = 0
    let step = 1
    while (i < decimals) {
        step *= 0.1
        points *= 10
        i++
    }
    points++
    const pixelSize = interval / clampedSize
    const pixelPoints = points / clampedSize
    const pointDist = Math.max(clampedSize / points, 1)

    let valuePos
    const invalid = !isNumber(value) || !(value >= min && value <= max)
    if (!invalid) {
        if (min === max) {
            valuePos = vertical ? 0 : size
            // readOnly = true
        } else {
            valuePos = -Math.round((value - min) / pixelSize)
            if (vertical) {
                valuePos += size
            } else {
                valuePos *= -1
            }
        }
    }
    const axis = vertical ? "Y" : "X"
    const oppDir = vertical ? "h" : "v"
    const axisDim = vertical ? "height" : "width"
    const oppAxisDim = vertical ? "width" : "height"
    const axisMargin = vertical ? "top" : "left"
    const oppAxisMargin = vertical ? "left" : "top"

    const overlayAttr = {
        ["origin" + axis]: sledShort >> 1,
        [axisDim]: size + (sledShort >> 1),
        [oppAxisDim]: sledLong
    }
    const stackAttr = {
        [axisDim]: clampedSize,
        [oppAxisDim]: oppSize
    }
    if (interactive) {
        stackAttr.style = { cursor: "pointer" }
    }
    const valueAttr = invalid
        ? {}
        : {
              [axisDim]: vertical ? size - valuePos : valuePos
          }
    const sledOverlayAttr = invalid
        ? {}
        : {
              [axisMargin]: -(sledShort >> 1) + valuePos,
              [oppAxisMargin]: margin
          }
    const indicatorAttr = invalid
        ? {}
        : {
              [axisMargin]: -(sledShort >> 1) + valuePos
          }
    const handleAttr = {
        [axisDim]: sledShort - sledBorders,
        [oppAxisDim]: sledLong - sledBorders - margin
    }
    cls.addIf(disabled, "opacity-50")
    const gripCls = new ClassNames(
        "focus:outline-none focus:ring focus:ring-focus-border"
    )
    gripCls.addIf(clicked, "bg-active-bg", "bg-button-bg")
    gripCls.addIf(
        border,
        "border-button-border border" // + (border === "1" ? "1" : "width")
    )
    /*
    gripCls.addIf(radius, "button-border-radius")
    stackCls.addIf(railRadius, "input-border-radius")
    */

    gripCls.addIf(interactive, "hover-change", "no-events")
    if (invalid) {
        children = (
            <Div
                className="full bg-input-bg invalid focus:outline-none focus:ring focus:ring-focus-border"
                tab={tab}
                onKeyDown={(e) => {
                    if (e.key !== " ") {
                        return
                    }
                    set(min)
                    e.preventDefault()
                }}
            />
        )
    } else if (!children) {
        children = []
        children.push(
            <Div
                key="a"
                full={oppDir}
                className="bg-active-bg"
                {...valueAttr}
            />
        )
        children.push(<Div key="b" className="auto bg-input-bg" />)
        if (vertical) {
            children.reverse()
        }
    }

    const setSliderPos = !interactive
        ? (e) => e.preventDefault()
        : (e) => {
              const rect = divRef.current.getBoundingClientRect()
              let dist = e["client" + axis] - rect[axis.toLowerCase()]
              if (vertical) {
                  dist = clampedSize - dist
              }
              if (pixelPoints < 1) {
                  dist =
                      Math.round(
                          Math.max(dist - pointDist / 2, 0) / pointDist
                      ) * step
              } else {
                  dist *= pixelSize
              }
              set(clamp(min, round(min + dist, decimals), max))
              if (tab) {
                  requestAnimationFrame(
                      () => sledRef.current && sledRef.current.focus()
                  )
              }
              startSliding()
          }

    const startSliding = !interactive
        ? (e) => e.preventDefault()
        : () => {
              const rect = divRef.current.getBoundingClientRect()
              const start = rect[axis.toLowerCase()]
              aContext.startExclusiveMode("mouse:move-slider", "grabbing")
              setClicked(true)
              aContext.addEventListener(
                  "mouseup",
                  () => {
                      aContext.endExclusiveMode("mouse:move-slider")
                      setClicked(false)
                      if (focusRef && focusRef.current) {
                          focusRef.current.focus()
                      }
                  },
                  { once: true }
              )
              aContext.addEventListener("mousemove", (e) => {
                  const { value } = propsRef.current
                  let dist = e["client" + axis] - start
                  if (vertical) {
                      dist = clampedSize - dist
                  }
                  dist *= pixelSize
                  const newValue = clamp(min, round(min + dist, decimals), max)
                  if (value !== newValue) {
                      set(newValue)
                  }
              })
          }

    const focusAttr = useFocusKeyBindings(
        {
            keyHandlers: [
                {
                    keys: ["ArrowDown", "ArrowLeft"],
                    handler: (e) => {
                        if (!interactive) return

                        const { value } = propsRef.current
                        const newValue = clamp(
                            min,
                            value - (e.shiftKey ? step * 10 : step),
                            max
                        )
                        if (newValue !== value) {
                            set(newValue)
                        }
                    }
                },
                {
                    keys: ["ArrowUp", "ArrowRight"],
                    handler: (e) => {
                        if (!interactive) return

                        const { value } = propsRef.current
                        const newValue = clamp(
                            min,
                            value + (e.shiftKey ? step * 10 : step),
                            max
                        )
                        if (newValue !== value) {
                            set(newValue)
                        }
                    }
                }
            ]
        },
        !interactive
    )
    const railCls = new ClassNames("full grid")
    if (center) {
        railCls.addIf(vertical, "justify-center", "content-center")
    }
    return (
        <Overlays full={oppDir} className={cls.value} {...overlayAttr}>
            <Overlay className={vertical ? "w-full" : "full"}>
                <Div className={railCls.value} ref={divRef}>
                    <AvailContext.Provider
                        value={{
                            [axisDim]: clampedSize,
                            [oppAxisDim]: railProps.oppSize
                        }}
                    >
                        <Stack
                            className={stackCls.value}
                            onMouseDown={setSliderPos}
                            vertical={vertical}
                            gapped={false}
                            {...stackAttr}
                        >
                            {children}
                        </Stack>
                    </AvailContext.Provider>
                </Div>
            </Overlay>
            {getIndicator && !invalid && (
                <Overlay className="no-events" {...indicatorAttr}>
                    {getIndicator()}
                </Overlay>
            )}
            {!invalid && (
                <Overlay {...sledOverlayAttr}>
                    <Div
                        ref={sledRef}
                        cursor={interactive ? "grab" : false}
                        tab={tab}
                        onMouseDown={startSliding}
                        className={gripCls.value}
                        {...handleAttr}
                        {...focusAttr}
                    />
                </Overlay>
            )}
        </Overlays>
    )
}

function Button({
    name,
    onMouseDown,
    onPressed,
    onPressedEnd,
    icon,
    value,
    activated,
    disabled,
    reverse,
    full,
    invalid,
    readOnly,
    autoFocus,
    submit,
    refocus = null,
    sized = true,
    colored = true,
    padded = true,
    styled = true,
    bordered = true,
    tab = true,
    tabControlled,
    className,
    iconClassName,
    ...props
}) {
    const aContext = useContext(AppContext)
    const fContext = useContext(FormContext)
    const mounted = useMounted()
    const [clicked, setClicked] = useState(false)
    const [focused, setFocused] = useState(false)

    const focusRef = useRef(null)
    const focusedRef = useRef(null)
    focusedRef.current = focused

    const attr = useGetAttrWithDimProps(props)
    if (focused) {
        attr.style.zIndex = 19999
    }

    const cls = new ClassNames(
        "focus:outline-none focus:ring focus:ring-focus-border",
        className
    )
    cls.addIf(autoFocus, "autofocus")
    cls.addIf(styled && sized, "text-xs")
    cls.addIf(styled && padded, "px-dbx py-dby")

    const cannotSubmit = submit && (disabled || (fContext && fContext.invalid))
    useEffect(() => {
        if (!submit || !aContext.getModalLevel()) return

        aContext.setModalSubmit(cannotSubmit ? null : onPressed)
    }, [cannotSubmit])
    if (cannotSubmit) disabled = true

    const interactive = !(disabled || readOnly)
    attr.style.cursor = interactive ? "pointer" : "default"
    cls.addIf(disabled, "opacity-50")
    cls.addIf(interactive, "hover:brightness-110")
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
    useMarkInvalid(cls, invalid)

    const iconCls = new ClassNames("not_leading-none", iconClassName)
    attr.ref = focusRef
    attr.onFocus = (e) => {
        setFocused(true)
        if (props.onFocus) props.onFocus(e)
    }
    attr.onBlur = () => {
        requestAnimationFrame(() => {
            if (mounted.current) {
                setFocused(false)
            }
        })
    }
    attr.tabIndex = useGetTabIndex({ tab, tabControlled, focused }, cls)

    const initPressedHandling = (startEvent, source, releaseEvent) => {
        const mode = `${source}:pressed`
        aContext.startExclusiveMode(mode, "pointer")

        let btnElem = startEvent.target
        while (btnElem.nodeName !== "BUTTON") btnElem = btnElem.parentNode

        aContext.addEventListener(
            releaseEvent,
            (e) => {
                aContext.endExclusiveMode(mode)
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

        if (onPressed) {
            onPressed(startEvent, { activated })
        }
    }
    return (
        <button
            className={cls.value}
            onKeyDown={(e) => {
                if (e.repeat || e.key !== " " || clicked) {
                    if (e.repeat) e.preventDefault()
                    return
                }
                if (interactive) initPressedHandling(e, "key", "keyup")
            }}
            onMouseDown={(e) => {
                if (!interactive) {
                    e.preventDefault()
                    return
                }
                if (onMouseDown) onMouseDown(e)
                aContext.setButtonRefocus(refocus)
                if (tab && !tabControlled) {
                    focusRef.current.focus()
                    requestAnimationFrame(() => {
                        if (focusRef.current) {
                            focusRef.current.focus()
                        }
                    })
                }
                initPressedHandling(e, "mouse", "mouseup")
                aContext.setButtonRefocus(null)
            }}
            {...attr}
        >
            <div className={innerCls.value}>
                {icon && <Icon className={iconCls.value} name={icon} />}
                {name && <div className="truncate">{name}</div>}
            </div>
        </button>
    )
}

function Submit(props) {
    return <Button type="submit" {...props} />
}

function ButtonGroup({
    className,
    buttons = [],
    gapped = true,
    wrap = true,
    buttonProps = {},
    autoFocus,
    active,
    rowChange,
    lastTabIndex,
    setLastTabIndex,
    ...props
}) {
    const containerProps =
        buttons.length && buttons[0].activated !== undefined
            ? { items: buttons.map((x) => x.activated) }
            : { count: buttons.length }
    const container = useManagedContainer(containerProps)
    useItemFocusOnContainer({ container, cursor: false })

    if (active !== undefined) {
        container.selection = active !== undefined ? [active] : []
    }
    const style = useExtractDimProps(props)
    const cls = new ClassNames("stack-h", className)
    cls.addIf(gapped, "gap-2")
    cls.addIf(wrap, "flex-wrap", "flex-nowrap overflow-auto")

    const elems = []
    let i = 0
    for (const [i, button] of buttons.entries()) {
        const curr = i
        const itemAttr = container.getItem(curr)
        const elemProps = {
            ...itemAttr.attr.props,
            ...buttonProps,
            ...button,
            autoFocus
        }
        elems.push(
            <Button
                key={i}
                {...elemProps}
                tabControlled
                refocus={container.refocus}
            />
        )
    }
    return (
        <Div {...container.attr.props} className={cls.value}>
            {elems}
        </Div>
    )
}

function ButtonGroup2({
    className,
    buttons = [],
    gapped = true,
    wrap = true,
    buttonProps = {},
    autoFocus,
    active,
    rowChange,
    lastTabIndex,
    setLastTabIndex,
    ...props
}) {
    const stackRef = useRef(null)
    const { focusItem, attr, refocus, ...focus } = useFocusManager({
        divRef: stackRef,
        rowChange,
        count: buttons.length,
        lastTabIndex,
        setLastTabIndex,
        active: active !== undefined ? active : 0,
        setActive: () => {}
    })
    const style = useExtractDimProps(props)

    const cls = new ClassNames("stack-h", className)
    cls.addIf(gapped, "gap-2")
    cls.addIf(wrap, "flex-wrap", "flex-nowrap overflow-auto")

    const elems = []
    let i = 0

    for (const button of buttons) {
        const curr = i
        const itemAttr = focus.itemAttr(curr)

        const { tab, onMouseDown, onFocus } = itemAttr
        const elemProps = {
            ...buttonProps,
            ...button,
            tab,
            autoFocus
        }

        if (onFocus) {
            elemProps.onFocus = onFocus
        }
        let onPressedNew = null
        if (!elemProps.readOnly) {
            const oldHandler = elemProps.onPressed
            if (oldHandler) {
                onPressedNew = (e) => {
                    oldHandler(e)
                    onMouseDown(e)
                }
            } else {
                onPressedNew = onMouseDown
            }
        }
        elemProps.onPressed = onPressedNew
        elems.push(
            <Button
                key={i}
                {...elemProps}
                tabControlled
                refocus={refocus}
                onPressedEnd={(outside) => {
                    if (elemProps.onPressedEnd) {
                        elemProps.onPressedEnd(outside)
                    }
                    refocus()
                }}
            />
        )
        i++
    }

    /*
     */

    return (
        <Div ref={stackRef} className={cls.value} style={style} {...attr}>
            {elems}
        </Div>
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

const FormContext = createContext()

function Form({ children, submit, onKeyDown, className, ...props }) {
    const [invalid, setInvalid] = useState(false)
    const mounted = useMounted()

    const cls = new ClassNames("form", className)

    const formRef = useRef(null)
    const invalidRef = useRef(null)
    invalidRef.current = invalid

    const value = {
        invalid,
        markInvalid: () => {
            if (!invalidRef.current) {
                setInvalid(true)
            }
        }
    }

    useEffect(() => {
        if (!mounted.current || !formRef.current) {
            return
        }

        const hasInvalid = () => {
            return formRef.current.querySelector(".invalid") !== null
        }

        const checkForInvalid = () => {
            if (!mounted.current) {
                return
            }
            if (invalidRef.current && !hasInvalid()) {
                setInvalid(false)
            }
            requestAnimationFrame(checkForInvalid)
        }

        if (hasInvalid()) {
            setInvalid(true)
        }
        checkForInvalid()
    }, [])

    const submitOnReturn = !submit
        ? null
        : (e) => {
              if (
                  e.key === "Enter" &&
                  !invalidRef.current &&
                  !(
                      d(document.activeElement) &&
                      document.activeElement.tagName === "TEXTAREA"
                  )
              ) {
                  submit()
                  e.preventDefault()
                  e.stopPropagation()
              } else if (onKeyDown) {
                  onKeyDown(e)
              }
          }

    return (
        <FormContext.Provider value={value}>
            <form
                className={cls.value}
                onKeyDown={submitOnReturn}
                onSubmit={(e) => {
                    e.preventDefault()
                    return false
                }}
                ref={formRef}
                {...props}
            >
                {children}
            </form>
        </FormContext.Provider>
    )
}

function FormGrid({ className, children, padded = true, ...props }) {
    const cls = new ClassNames(
        "grid grid-cols-[max-content_auto] gap-y-2",
        className
    )
    cls.addIf(padded, "px-4 py-2")

    return (
        <div className={cls.value} {...props}>
            {children}
        </div>
    )
}

function FullCell({ children, className }) {
    const cls = new ClassNames("col-span-2", className)
    return <div className={cls.value}>{children}</div>
}

function SectionCells({ name }) {
    return (
        <div className="col-span-2 text-sm pt-2 border-b border-app-text/20">
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

function ColorCells({ name, ...props }) {
    return (
        <CustomCells name={name}>
            <Color {...props} />
        </CustomCells>
    )
}

function SliderCells({ name, ...props }) {
    return (
        <CustomCells name={name}>
            <Slider {...props} />
        </CustomCells>
    )
}

export {
    FormContext,
    Button,
    Submit,
    ButtonGroup,
    Form,
    Input,
    Number,
    Textarea,
    Select,
    Radio,
    Checkbox,
    Slider,
    Picker,
    Color,
    AutoCompleteInput,
    FormGrid,
    FullCell,
    SectionCells,
    CustomCells,
    CheckboxCells,
    InputCells,
    NumberCells,
    TextareaCells,
    SelectCells,
    RadioCells,
    ColorCells,
    SliderCells,
    useMarkInvalid
}
