import { isString, d } from "./helper"

const getHttpStreamPromise = ({ response }) => {
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
        let reader = stream.getReader()
        return {
            getReaderPromise: Promise.resolve(reader),
            abort: async () => {
                if (stream.locked && reader !== null) {
                    clearInterval(timeout)
                    reader.cancel()
                }
            }
        }
    }
    // TODO http request stream
}

export { getHttpStreamPromise }
