import { isString, d } from "./helper"

const getHttpStreamPromise = (config, { path, response, ...props }) => {
    if (response) {
        // fake response given
        let timeout
        const lines = [...response]
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
                        timeout = setTimeout(push, 200)
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
            getReaderPromise: Promise.resolve(reader),
            abort: async () => {
                if (stream.locked) {
                    clearInterval(timeout)
                    reader.cancel()
                }
            }
        }
    }
    const controller = new AbortController()
    const signal = controller.signal

    const { baseUrl, dumpHeader } = config
    const url =
        (baseUrl.endsWith("/")
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl) + path

    const { headers = {}, ...options } = props
    headers[dumpHeader] = "cmd"

    const getReaderPromise = fetch(url, { signal, headers, ...options }).then(
        (response) => {
            if (!response.ok) {
                throw Error(
                    `Unexpected status code ${response.status} received from API`
                )
            }
            return response.body.getReader()
        }
    )
    return {
        getReaderPromise,
        abort: controller.abort
    }
}

export { getHttpStreamPromise }
