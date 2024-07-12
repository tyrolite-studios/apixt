// extracts the whitespaces at the start or throws an error if not whitespaces are at the start
const extractSpaces = (input) => {
    const match = /^\s+/.exec(input)
    if (!match) throw Error(`Expected space token but got: "${input}"`)

    return match[0]
}

// extracts a boolean token at the start or throws an error if no boolean token was found at the start
const extractBool = (input) => {
    if (/^true/i.test(input)) {
        return input.substring(0, 4)
    }
    if (/^false/i.test(input)) {
        return input.substring(0, 5)
    }
    throw Error(`Expected bool token but got: "${input}"`)
}

// extracts a JSON number token at the start or throws an error if no number token was found at the start
const extractNumber = (input) => {
    const match = /^-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/i.exec(input)
    if (!match || !match[0])
        throw Error(`Expected number token but got: "${input}"`)

    return match[0]
}

// extracts a JSON string token at the start or throws an error if no string token was found at the start
const extractString = (input) => {
    let pos = 1
    if (input.startsWith('"')) {
        while (pos < input.length) {
            const char = input[pos]
            if (char === '"') {
                return input.substring(0, pos + 1)
            }
            if (char === "\\") {
                const nextChar = pos <= input.length ? input[pos + 1] : ""

                if (nextChar === "u") {
                    if (!/^u[a-f0-9]{4}/i.test(input.substring(pos + 1))) break
                    pos += 5
                } else if (
                    ["\\", "b", "f", "n", "r", "t", '"'].includes(nextChar)
                ) {
                    pos++
                } else {
                    break
                }
            }
            pos++
        }
    }
    throw Error(`Expected string token but got: "${input}"`)
}

// extracts a null token at the start or throws an error if no null token was found at the start
const extractNull = (input) => {
    if (/^null/i.test(input)) {
        return input.substring(0, 4)
    }
    throw Error(`Expected null token but got: "${input}"`)
}

// tokenizes the given JSON string to an array of token objects or throws an error if the string could not be tokenized
const TokenizeJsonString = (jsonStr) => {
    const getToken = (input) => {
        if (!input) return { token: null, raw: "" }

        const char = input[0].toLowerCase()
        if (char === '"') {
            return {
                type: "string",
                raw: extractString(input)
            }
        } else if (["t", "f"].includes(char)) {
            return {
                type: "bool",
                raw: extractBool(input)
            }
        } else if (/[.0-9\-+]/.test(char)) {
            return {
                type: "number",
                raw: extractNumber(input)
            }
        } else if (["{", "}", "[", "]", ":", ","].includes(char)) {
            let end = undefined
            if (char === "{") end = "}"
            if (char === "[") end = "]"
            return {
                type: "symbol-" + char,
                raw: input[0],
                end
            }
        } else if (char === "n") {
            return {
                type: "null",
                raw: extractNull(input)
            }
        } else if (/^\s/.test(char)) {
            return {
                type: "space",
                raw: extractSpaces(input)
            }
        }
        throw Error(`Could not parse line: "${input}"`)
    }

    const tokens = []
    while (jsonStr.length > 0) {
        const token = getToken(jsonStr)
        if (!token.type) break

        tokens.push(token)
        jsonStr = jsonStr.substring(token.raw.length)
    }
    return tokens
}

export {
    extractBool,
    extractNull,
    extractNumber,
    extractSpaces,
    extractString,
    TokenizeJsonString
}
