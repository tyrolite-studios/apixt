/**
 * Debug function which logs the given parameters on the console and returns the first param
 *
 * @param {mixed} main
 * @param {mixed} params
 *
 * @returns {mixed}
 */
function d(main, ...params) {
    let stack = []
    try {
        throw Error("foo")
    } catch (e) {
        stack = e.stack.split("\n")
    }
    const func = []
    let no = 0
    for (const line of stack) {
        const pos = no
        no++
        if (pos <= 1) continue

        if (pos === 2) {
            func.push(line.trim())
            continue
        }
        if (pos > 6) break

        const [first] = line.split("(")
        func.push(first.substring(6).trim())
    }
    console.group("Debug " + func.join(" <- "))
    console.log(main, ...params)
    console.groupEnd()

    return main
}

/**
 * Returns whether the given value is null or not
 *
 * @param {mixed} value
 *
 * @returns {boolean}
 */
const isNull = (value) => value === null

/**
 * Returns whether the given value is a string or not
 * Instances of the String class will not be regarded as strings.
 *
 * @param {mixed} value
 *
 * @returns {boolean}
 */
function isString(value) {
    return typeof value === "string"
}

/**
 * Returns whether the given value is an array or not
 *
 * @param {mixed} value
 *
 * @returns {boolean}
 */
function isArray(value) {
    return Array.isArray(value)
}

/**
 * Returns whether the argument is an object or not
 * Array instances are not regarded as objects
 *
 * @param {mixed} obj
 *
 * @returns {boolean}
 */
function isObject(obj) {
    return !!obj && typeof obj === "object" && !isArray(obj)
}

/**
 * Returns whether the given value is a function or not
 *
 * @param {mixed} value
 *
 * @returns {boolean}
 */
function isFunction(value) {
    return typeof value === "function"
}

function extractFullClasses(cls) {
    if (!cls) return []
    const regex = /\b(full|w-full|h-full)\b/g
    return cls.match(regex) || []
}

class ClassNames {
    constructor(cls = "", overwrites = "") {
        this.cls = []
        this.add(cls)
        this.overwrites = overwrites
    }

    add(cls = "") {
        if (!cls) return

        this.cls.push(cls)
    }

    addIf(condition, ifCls, elseCls = "") {
        if (condition) {
            this.add(ifCls)
        } else {
            this.add(elseCls)
        }
    }

    addIfProps(clsToCondition) {
        for (const [cls, condition] of Object.entries(clsToCondition)) {
            if (isFunction(condition)) {
                condition = condition()
            }
            if (condition) this.add(cls)
        }
    }

    getDeletesAndAdds() {
        const parts = this.overwrites.split(" ")
        const deletes = []
        const adds = []
        for (const part of parts) {
            if (part[0] === "!") {
                deletes.push(part.substring(1))
            } else {
                adds.push(part)
            }
        }
        return {
            adds,
            deletes
        }
    }

    get value() {
        const joined = this.cls.join(" ")
        if (!this.overwrites) return joined

        const { adds, deletes } = this.getDeletesAndAdds()
        const parts = joined.split(" ").filter((cls) => !deletes.includes(cls))

        return [...parts, ...adds].join(" ")
    }
}

export {
    d,
    isString,
    isArray,
    isNull,
    isObject,
    extractFullClasses,
    ClassNames
}
