import { TokenizeJsonString } from "./tokenizer"

const COLOR_CLS = {
    num: "text-crimson",
    null: "text-blue",
    bool: "text-purple",
    str: "text-maroon",
    key: "text-teal",
    default: "text-black"
}

const tokenTypeToCls = {
    bool: COLOR_CLS.bool,
    number: COLOR_CLS.num,
    string: COLOR_CLS.str,
    key: COLOR_CLS.key,
    null: COLOR_CLS.null,
    "symbol-[": COLOR_CLS.default,
    "symbol-]": COLOR_CLS.default,
    "symbol-{": COLOR_CLS.default,
    "symbol-}": COLOR_CLS.default,
    "symbol-:": COLOR_CLS.default,
    "symbol-,": COLOR_CLS.default
}

/**
 * Returns the stringified JSON with syntax highlighting
 *
 * @param {mixed} input The Object to stringify
 * @param {number} indentation The number of spaces for indentation
 *
 * @returns {string} The stringified JSON of the input
 */
const getStringifiedJSON = (input, indentation) => {
    const jsonStr = JSON.stringify(input, null, indentation)
    if (!jsonStr) return undefined

    const tokens = TokenizeJsonString(jsonStr)

    let result = ""
    let pos = 0
    const lastPos = tokens.length - 1
    while (pos <= lastPos) {
        let { type, raw, end } = tokens[pos]
        if (type === "string" && pos < lastPos && tokens[pos + 1].raw === ":") {
            // object key
            type = "key"
        } else if (end && pos < lastPos) {
            // empty object or array
            if (tokens[pos + 1].raw === end) {
                raw += end
                pos++
            }
        }
        const color = tokenTypeToCls[type] ? tokenTypeToCls[type] : null
        result += color ? `<span class="${color}">${raw}</span>` : raw
        pos++
    }
    return result
}

export { getStringifiedJSON, COLOR_CLS }
