import { isString, d, isInt, isArray } from "./helper"
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
    const expected = isArray(expect)
        ? (response) => expect.includes(response.status)
        : expect

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
        status,
        fetchPromise: Promise.resolve(reader),
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

    let url =
        (baseUrl.endsWith("/")
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl) + path

    if (query) url += "?" + query

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

export {
    startAbortableApiBodyRequest,
    startAbortableApiRequestStream,
    startAbortableApiRequest,
    isMethodWithRequestBody,
    isMethodWithResponseBody
}
