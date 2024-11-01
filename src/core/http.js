import { isString, d, isInt, isArray } from "./helper"

const isMethodWithBody = (method) =>
    ["POST", "PUT", "GET"].includes(method.toUpperCase())

const startAbortableApiRequest = (
    baseUrl,
    {
        expect = (response) => response.ok,
        path,
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

    const url =
        (baseUrl.endsWith("/")
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl) + path

    const request = {
        status: null,
        abort: controller.abort,
        fetchPromise: thenChain(
            fetch(baseUrl + path, {
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
    { responseStream, ...options }
) => {
    if (responseStream) {
        const { status, lines, interval } = responseStream
        return startAbortableArrayStream(lines, interval, status)
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
    if (!isMethodWithBody(method))
        throw Error(
            `Trying to start body request with unsupported method "${method}"`
        )

    const request = startAbortableApiRequest(baseUrl, {
        method,
        ...options,
        thenChain: (promise) =>
            promise.then(async (response) => ({
                status: response.status,
                body: await response.text()
            }))
    })

    return request
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

export {
    startAbortableApiBodyRequest,
    startAbortableApiRequestStream,
    startAbortableApiRequest
}
