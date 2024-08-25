import { TokenizeJsonString } from "./tokenizer"

const isValidJson = (str) => {
    try {
        JSON.parse(str)
        return true
    } catch (e) {
        return false
    }
}

const requestHeaderOptions = {
    "A-IM": "string",
    Accept: "string",
    "Accept-Charset": "string",
    "Accept-Datetime": "string",
    "Accept-Encoding": "string",
    "Accept-Language": "string",
    "Access-Control-Request-Method": "string",
    "Access-Control-Request-Headers": "string",
    Authorization: "string",
    "Cache-Control": "string",
    Connection: "string",
    "Content-Length": "number",
    "Content-MD5": "string",
    "Content-Type": "string",
    Cookie: "string",
    Date: "string",
    Expect: "string",
    Forwarded: "string",
    From: "string",
    Host: "string",
    "If-Match": "string",
    "If-Modified-Since": "string",
    "If-None-Match": "string",
    "If-Range": "string",
    "If-Unmodified-Since": "string",
    "Max-Forwards": "number",
    Origin: "string",
    Pragma: "string",
    "Proxy-Authorization": "string",
    Range: "string",
    Referer: "string",
    TE: "string",
    Trailer: "string",
    "Transfer-Encoding": "string",
    "User-Agent": "string",
    Upgrade: "string",
    Via: "string",
    Warning: "string",
    DNT: "string",
    "Upgrade-Insecure-Requests": "string",
    "X-Requested-With": "string",
    "X-Forwarded-For": "string",
    "X-Forwarded-Host": "string",
    "X-Forwarded-Proto": "string",
    "Front-End-Https": "string",
    "X-HTTP-Method-Override": "string",
    "X-Frame-Options": "string",
    "X-Content-Type-Options": "string",
    "X-XSS-Protection": "string",
    "X-RateLimit-Limit": "number",
    "X-RateLimit-Remaining": "number",
    "X-RateLimit-Reset": "number",
    "X-Correlation-ID": "string",
    "X-Request-ID": "string"
}

//Not all available types.. Maybe just use for recommendation
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

const COLOR_CLS = {
    num: "text-teal-600",
    null: "text-blue-500",
    bool: "text-purple-500",
    str: "text-rose-400",
    key: "text-indigo-400",
    default: "text-slate-400/80"
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

export {
    getStringifiedJSON,
    COLOR_CLS,
    isValidJson,
    requestHeaderOptions,
    headerContentTypes,
    emptyValue
}
