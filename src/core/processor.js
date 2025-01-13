import { d, without } from "./helper"

const startStageProcessing = async (fetchOp) => {
    const processing = {
        abort: () => {},
        op: fetchOp,
        promise: Promise.resolve(),
        statusRef: { setStatus: null, status: "Preprocessing..." }
    }
    // execute preprocessors
    while (fetchOp.preprocessors.length) {
        const processor = fetchOp.preprocessors.shift()
        try {
            await processor(fetchOp)
        } catch (error) {
            processing.promise = Promise.reject(error)
            return processing
        }
    }
    processing.promise = new Promise(async (resolve, reject) => {
        processing.abort = () => {
            let error = new DOMException(
                "The operation was aborted.",
                "AbortError"
            )
            try {
                for (const abort of fetchOp.aborts) abort()
            } catch (e) {
                error = e
            }
            reject(error)
        }
        const updateStatus = (newStatus) => {
            const setStatus = processing.statusRef.setStatus
            processing.statusRef.status = newStatus
            if (setStatus) setStatus(newStatus)
        }
        while (fetchOp.stages.length) {
            const stage = fetchOp.stages.shift()
            try {
                await stage(fetchOp, updateStatus)
            } catch (e) {
                // TODO catch abort errors here?
                reject(e)
                return
            }
        }
        resolve(fetchOp.result)
    })
    return processing
}

export { startStageProcessing }
