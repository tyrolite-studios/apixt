import { isString, d, isInt, isArray, isObject } from "./helper"
import { CMD } from "core/tree"

const isMethodWithRequestBody = (method) =>
    ["POST", "PUT", "PATCH"].includes(method.toUpperCase())

const isMethodWithResponseBody = (method) =>
    !["HEAD", "OPTIONS"].includes(method)

const startAbortableApiRequest = (
    baseUrl,
    {
        expect = (response) => response.ok,
        path,
        query,
        response,
        thenChain = (x) => x,
        ...options
    }
) => {
    const controller = new AbortController()

    if (isInt(expect)) expect = [expect]
    const expected = (response) =>
        isArray(expect) ? expect.includes(response.status) : true

    let url =
        (baseUrl.endsWith("/")
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl) + path

    if (query) url += "?" + query

    const request = {
        status: null,
        abort: controller.abort,
        fetchPromise: thenChain(
            fetch(url, {
                signal: controller.signal,
                ...options
            }).then((response) => {
                request.status = response.status
                if (!expected(response))
                    throw Error(
                        `Unexpected HTTP response code ${response.status} from API`
                    )
                return response
            })
        )
    }
    return request
}

const startAbortableApiRequestStream = (
    baseUrl,
    { responseStream, api, ...options }
) => {
    if (responseStream) {
        const { status, lines, interval } = responseStream
        return startAbortableArrayStream(lines, interval, status)
    }
    if (api) {
        return startAbortableRequestResponse(baseUrl, options)
    }
    const request = startAbortableApiRequest(baseUrl, {
        ...options,
        thenChain: (promise) =>
            promise.then((response) => response.body.getReader())
    })

    return request
}

const startAbortableApiBodyRequest = (
    baseUrl,
    { response, method, ...options }
) => {
    if (response) {
        const { status = 200, body } = response
        return {
            status,
            abort: () => {},
            fetchPromise: Promise.resolve({
                body: isString(body) ? body : JSON.stringify(body),
                status
            })
        }
    }
    if (!isMethodWithResponseBody(method))
        throw Error(
            `Trying to start body request with unsupported method "${method}"`
        )

    return startAbortableApiRequest(baseUrl, {
        method,
        ...options,
        thenChain: (promise) =>
            promise.then(async (response) => ({
                status: response.status,
                body: await response.text()
            }))
    })
}

const startAbortableArrayStream = (
    streamLines,
    interval = 200,
    status = 200
) => {
    let timeout
    const lines = [...streamLines]
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        start(controller) {
            function push() {
                if (lines.length) {
                    let line = lines.shift()
                    controller.enqueue(
                        encoder.encode(
                            (isString(line) ? line : JSON.stringify(line)) +
                                "\n"
                        )
                    )
                    timeout = setTimeout(push, interval)
                } else {
                    controller.close()
                }
            }
            push()
        },
        cancel() {
            clearInterval(timeout)
        }
    })
    const reader = stream.getReader()
    return {
        status: "Streaming...",
        promise: Promise.resolve(reader),
        abort: async () => {
            if (stream.locked) {
                clearInterval(timeout)
                reader.cancel()
            }
        }
    }
}

const startAbortableRequestResponse = (
    baseUrl,
    { method, path, query, ...options }
) => {
    const controller = new AbortController()

    const [pathOnly, rawQuery] = path.split("?")
    let url =
        (baseUrl.endsWith("/")
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl) + pathOnly

    const queryParts = []
    if (rawQuery) queryParts.push(rawQuery)
    if (query) queryParts.push(query)

    if (queryParts.length) {
        url += "?" + queryParts.join("&")
    }
    const request = {
        status: null,
        abort: controller.abort,
        fetchPromise: fetch(url, {
            method,
            signal: controller.signal,
            ...options
        }).then(async (response) => {
            const contentType = response.headers.get("content-type") ?? ""
            const [mime] = contentType.split(";")
            const lines = [
                { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
                { cmd: CMD.OPEN_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Header",
                    content:
                        "<pre>" +
                        Object.entries(response.headers)
                            .map(([name, value]) => `${name}: ${value}`)
                            .join("\n") +
                        "</pre>"
                },
                { cmd: CMD.CLOSE_SECTION_DETAILS },
                {
                    cmd: CMD.ADD_CODE_BLOCK,
                    name: "Http Response",
                    tags: ["api.response"],
                    content: await response.text(),
                    mime,
                    footer: {
                        Status: response.status,
                        "Content-Type": contentType
                    },
                    isError: response.status >= 400
                },
                { cmd: CMD.CLOSE_SECTION },
                { cmd: CMD.END }
            ]
            const encoder = new TextEncoder()
            const stream = new ReadableStream({
                start(controller) {
                    while (lines.length) {
                        let line = lines.shift()
                        controller.enqueue(
                            encoder.encode(
                                (isString(line) ? line : JSON.stringify(line)) +
                                    "\n"
                            )
                        )
                    }
                    controller.close()
                },
                cancel() {
                    clearInterval(timeout)
                }
            })

            request.status = response.status

            return stream.getReader()
        })
    }
    return request
}

const addQueryParams = (params, name, value, path = []) => {
    if (isArray(value)) {
        const pathNode = [0, 0]
        path.push(pathNode)
        for (const [idx, subValue] of value.entries()) {
            pathNode[0] = idx
            addQueryParams(params, name, subValue, path)
        }
    }
    if (isObject(value)) {
        for (const [subKey, subValue] of Object.entries(value)) {
            addQueryParams(params, name, subValue, [...path, subKey])
        }
    }
    if (isString(value)) {
        let fullname = name
        for (const node of path) {
            if (isArray(node)) {
                if (node[0] === node[1]) {
                    node[1]++
                    fullname += "[]"
                    continue
                }
            }
            fullname += `[${isArray(node) ? node[0] : node}]`
        }
        params.append(fullname, value)
    }
}

const getQueryStringForJson = (json) => {
    const params = new URLSearchParams()
    for (const [name, value] of Object.entries(json)) {
        addQueryParams(params, name, value)
    }
    return params.toString().replaceAll("%5B", "[").replaceAll("%5D", "]")
}

const createPathValue = (path, value) => {
    let result = value
    let i = path.length
    while (i > 0) {
        i--
        const curr = path[i]
        if (curr === "]" || curr === "0]") {
            result = [result]
            continue
        }
        const key = curr.substring(0, curr.length - 1)
        result = { [key]: result }
    }
    return result
}

// TODO throw error if param is array and object at the same time and on parsing errors (missing ], ? etc.)
const addQueryParamToJson = (queryParam, result) => {
    const [nameAndPath, value = ""] = queryParam.split("=")

    const [name, ...path] = nameAndPath.split("[")
    if (path.length === 0) {
        if (result[name] !== undefined)
            throw Error(`Param name ${name} already exists!`)
        result[name] = value
    }
    let ref = result[name]
    while (path.length) {
        const curr = path.shift()
        if (curr === "]") {
            if (ref === undefined) {
                const newArray = []
                result[name] = newArray
                ref = newArray
            }
            ref.push(createPathValue(path, value))
            return
        } else {
            const key = curr.substring(0, curr.length - 1)
            if (ref === undefined) {
                const newObj = {}
                result[name] = newObj
                ref = newObj
            }
            if (ref[key] === undefined) {
                ref[key] = createPathValue(path, value)
                return
            }
            if (!path.length) {
                ref[key] = value
                return
            }
            ref = ref[key]
        }
    }
}

const getParsedQueryString = (queryString) => {
    const params = new URLSearchParams(queryString)
    const result = {}

    for (const [key, value] of params.entries()) {
        addQueryParamToJson(`${key}=${value}`, result)
    }
    return result
}

function getWithoutProtocol(url) {
    if (url.startsWith("http://")) {
        return url.substring(7)
    }
    return url.startsWith("https://") ? url.substring(8) : url
}

function getPathInfo(fullPath) {
    const [path, query] = fullPath.split("?")
    const pathParts = path.substring(1).split("/")
    const pathComponents = []
    let varIndex = -1
    let regexp = "^"
    for (const pathPart of pathParts) {
        if (pathPart.startsWith(":")) {
            varIndex++
            pathComponents.push({
                fix: false,
                value: pathPart.substring(1),
                ref: varIndex
            })
            regexp += "\\/([^\\/:?]*)"
        } else {
            pathComponents.push({ fix: true, value: pathPart })
            regexp += "\\/" + pathPart
        }
    }
    regexp += "$"
    return {
        fullPath: fullPath,
        path,
        query,
        components: pathComponents,
        varCount: varIndex + 1,
        regexp
    }
}

function getPathParams(pathInfo, fullPath) {
    const [path] = fullPath.split("?")
    if (!pathInfo.varCount) return []

    const matchExpr = new RegExp(pathInfo.regexp)

    const matches = matchExpr.exec(path)
    if (matches === null) return []

    const result = []
    let i = 0
    while (i < pathInfo.varCount) {
        i++
        result.push(matches[i])
    }
    return result
}

function getResolvedPath(path, params = [], strict = false) {
    const pathInfo = getPathInfo(path)
    if (!pathInfo.varCount) return path

    if (strict && pathInfo.varCount !== params.length)
        throw Error(
            `Path ${path} requires ${pathInfo.varCount} parameters but only got ${params.length}`
        )

    let resolved = []
    for (const { fix, value, ref } of pathInfo.components) {
        resolved.push(fix ? value : params[ref] ?? "")
    }
    return (
        "/" + resolved.join("/") + (pathInfo.query ? "?" + pathInfo.query : "")
    )
}

function getBodyTypeForMime(mime) {
    const [main, sub] = mime.split("/")

    switch (sub) {
        case "json":
        case "xml":
        case "html":
        case "csv":
            return sub

        case "plain":
            if (main === "text") return "text"
    }
    return
}

function getBodyTypeFromResponseHeaders(headers) {
    let contentType
    if (headers instanceof Headers) {
        contentType = headers.get("content-type")
    } else if (isObject(headers)) {
        const names = Object.keys(headers)
        for (const name of names) {
            if (name.toLowerCase() === "content-type") {
                contentType = headers[name]
                break
            }
        }
    }
    if (!contentType) return

    const [mime] = contentType.split(";")
    return getBodyTypeForMime(mime)
}

const simpleHeaders = [
    "Cache-Control",
    "Content-Language",
    "Content-Type",
    "Expires",
    "Last-Modified",
    "Pragma"
]

function getJsonForApiResponseHeaders(headers) {
    const keys = [...simpleHeaders, ...headers.keys()]

    const result = {}
    for (const key of keys) {
        const lcKey = key.toLowerCase()
        if (result[lcKey]) continue

        const value = headers.get(key)
        if (value === null) continue

        result[lcKey] = value
    }
    return result
}

export {
    startAbortableApiBodyRequest,
    startAbortableApiRequestStream,
    startAbortableApiRequest,
    startAbortableArrayStream,
    isMethodWithRequestBody,
    isMethodWithResponseBody,
    getParsedQueryString,
    getQueryStringForJson,
    getWithoutProtocol,
    getPathInfo,
    getPathParams,
    getResolvedPath,
    getBodyTypeForMime,
    getBodyTypeFromResponseHeaders,
    getJsonForApiResponseHeaders
}
