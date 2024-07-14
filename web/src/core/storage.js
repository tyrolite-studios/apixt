import { d, isString } from "./helper"

/**
 * Returns a boolean whether the given exception represents a quota exceeded on a browser storage or not
 *
 * @param {Exception} e
 *
 * @returns {boolean}
 */
function isQuotaExceededException(e) {
    return (
        typeof DOMException !== "undefined" &&
        e instanceof DOMException &&
        (e.name === "QuotaExceededError" ||
            e.name === "NS_ERROR_DOM_QUOTA_REACHED")
    )
}

/**
 * A factory method which returns a storage handler which is working on the given browser storage
 *
 * @param {object} storage
 *
 * @return {object}
 *
 */
const BrowserStorage = (storage, prefix = "") => {
    let isFull = false
    const keys = new Set()
    const idIndex = prefix.length
    for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key.startsWith(prefix)) keys.add(key.substring(idIndex))
    }
    const api = {
        get: (id) => {
            const value = storage.getItem(prefix + id)
            if (value === null) return

            return value
        },
        // TODO extract type from key-naem
        getByType: (type, id) => {
            const value = storage.getItem(prefix + id)
            if (value === null) return

            switch (type) {
                case "json":
                    return JSON.parse(value)
            }
            throw Error(`Unsupported type "${type}" for decoding given!`)
        },

        has: (id) => keys.has(id),

        set: (id, value) => {
            if (!isString(value))
                throw Error(`value for id "${id}" to a string`)

            try {
                storage.setItem(prefix + id, encoded)
            } catch (e) {
                if (isQuotaExceededException(e)) {
                    isFull = true
                }
                return false
            }
            keys.add(id)

            return true
        },

        setByType: (type, id, value) => {
            if (value === undefined)
                throw Error(`Cannot store undefined value for id "${id}"`)

            const encoded = api.encode(type, value)

            return api.set(id, encoded)
        },

        delete: (id) => {
            if (!keys.has(id)) return false

            storage.removeItem(prefix + id)
            keys.delete(id)
            isFull = false
            return true
        },

        keys: () => [...keys],

        isAvailable: () => {
            try {
                const x = "__storage_test__"
                storage.setItem(x, "1")
                storage.removeItem(x)
                return true
            } catch (e) {
                return (
                    typeof DOMException !== "undefined" &&
                    e instanceof DOMException &&
                    !isQuotaExceededException(e) &&
                    (e.code === 22 || e.code === 1014) &&
                    storage &&
                    storage.length !== 0
                )
            }
        },

        isFull: () => isFull,

        size: () => keys.size,

        encode: (type, value) => {
            switch (type) {
                case "json":
                    return JSON.stringify(value)
            }
            throw Error(`Unsupported type "${type}" for encoding given!`)
        }
    }
}

export { BrowserStorage }
