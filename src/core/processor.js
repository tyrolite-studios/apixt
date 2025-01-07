import { d, without } from "./helper"

const startFetchProcessing = async (fetchOp) => {
    // execute preprocessors
    const processing = {
        abort: () => {
            for (const signal of fetchOp.signals) {
                signal.abort()
            }
        }
    }
    while (fetchOp.preprocessors.length) {
        const processor = fetchOp.preprocessors.shift()
        const error = await processor(fetchOp)
        if (error) {
            processing.promise = new Promise.reject(error)
            return response
        }
    }
    processing.promise = new Promise(async (resolve, reject) => {
        while (fetchOp.stages.length) {
            const stage = fetchOp.stages.shift()
            try {
                await stage(fetchOp)
            } catch (e) {
                reject(e)
                return
            }
        }
        resolve(fetchOp.result)
    })
    return processing
}

const setPromptsAndExtracts = async (fetchOp) => {
    const prompts = ["test"]
    const extracts = []
    fetchOp.prompts = prompts
    fetchOp.extracts = extracts
}

const fireRequestStage = async (fetchOp) => {
    const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            fetchOp.signals = without(fetchOp.signals, signal)
            resolve()
        }, 2000)
        const signal = {
            abort: () => {
                clearTimeout(timeout)
                reject("Aborted")
            }
        }
        fetchOp.signals.push(signal)
    }).catch((e) => {
        throw e
    })

    await promise

    fetchOp.status = 401
    fetchOp.result = "Unauthorized"
}

const retryAuthorization = async (fetchOp) => {
    if (fetchOp.status === 401) {
        fetchOp.stages.unshift(fireRequestStage)
    }
}

export {
    startFetchProcessing,
    setPromptsAndExtracts,
    fireRequestStage,
    retryAuthorization
}
