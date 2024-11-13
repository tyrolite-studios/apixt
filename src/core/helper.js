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

function isNumber(value) {
    return typeof value === "number" && !isNaN(value)
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

function isInt(value) {
    return typeof value === "number" && Number.isInteger(value)
}

function isBool(value) {
    return typeof value === "boolean"
}

function extractFullClasses(cls) {
    if (!cls) return []
    const regex = /\b(full|w-full|h-full)\b/g
    return cls.match(regex) || []
}

function Attributes(props) {
    const cls = new AttriutesCls(props)
    return new Proxy(cls, {
        set: (target, prop, value) => {
            cls.add(prop, value)
            return true
        }
    })
}

class AttriutesCls {
    constructor(props = {}) {
        this._props = {}

        this.add(props)
    }

    get style() {
        let style = this._props.style
        if (!style) {
            style = {}
            this._props.style = style
        }
        return style
    }

    get props() {
        return this._props
    }

    setStyle(name, value) {
        this.style[name] = value
        return this
    }

    setStyles(obj) {
        for (const [name, value] of Object.entries(obj)) {
            this.setStyle(name, value)
        }
        return this
    }

    add(name, value) {
        if (isObject(name)) {
            for (const [prop, propValue] of Object.entries(name)) {
                this._props[prop] = propValue
            }
            return this
        }
        this._props[name] = value
        return this
    }
}

function ClassNames(cls = "", overwrites = "") {
    return new ClassNamesCls(cls, overwrites)
}

class ClassNamesCls {
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
            if (part.startsWith("not_")) {
                deletes.push(part.substring(4))
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

function isEventInRect(e, rect) {
    const x = e.clientX
    const y = e.clientY

    return (
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    )
}

function isInRange(value, min, max) {
    if (min !== undefined && value < min) return false
    if (max !== undefined && value > max) return false
    return true
}

const isValidJson = (str) => {
    try {
        JSON.parse(str)
        return true
    } catch (e) {
        return false
    }
}

function clamp(min, curr, max) {
    const minValue = min === null ? curr : Math.max(min, curr)
    if (max == null) return minValue
    return Math.min(minValue, max)
}

const round = (value, decimals = 0, fill = false) => {
    const reqDecimals = decimals
    let factor = 1
    while (decimals-- > 0) {
        factor *= 10
    }
    let rounded = Math.round(value * factor) / factor
    if (fill) {
        const parts = ("" + rounded).split(".")
        if (parts.length === 1) {
            parts.push("")
        }
        parts[1] = parts[1].padEnd(reqDecimals, "0")
        rounded = parts.join(".")
    }
    return rounded
}

function cloneDeep(value) {
    if (value === undefined) return
    if (value === null) return null
    if (Array.isArray(value)) {
        return value.map((item) => cloneDeep(item))
    } else if (typeof value === "object") {
        const obj = {}
        for (let [key, subValue] of Object.entries(value)) {
            obj[key] = cloneDeep(subValue)
        }
        return obj
    }
    return value
}

function apply(source, target) {
    for (const [key, value] of Object.entries(source)) {
        target[key] = value
    }
}

function rgb2hex(rgb) {
    const [r, g, b, a] = rgb.split(" ")
    return (
        "#" +
        parseInt(r).toString(16).padStart(2, "0") +
        parseInt(g).toString(16).padStart(2, "0") +
        parseInt(b).toString(16).padStart(2, "0") +
        (a === undefined ? "" : parseInt(a).toString(16).padStart(2, "0"))
    )
}

function getPathInfo(path) {
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
            regexp += "\\/([^\\/:?]+)"
        } else {
            pathComponents.push({ fix: true, value: pathPart })
            regexp += "\\/" + pathPart
        }
    }
    regexp += "$"
    return {
        path,
        components: pathComponents,
        varCount: varIndex + 1,
        regexp
    }
}

function getPathParams(pathInfo, path) {
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

const replacer = (key, value) =>
    value instanceof Object && !(value instanceof Array)
        ? Object.keys(value)
              .sort()
              .reduce((sorted, key) => {
                  sorted[key] = value[key]
                  return sorted
              }, {})
        : value

// copied from stackoverflow: https://stackoverflow.com/questions/1655769/fastest-md5-implementation-in-javascript
function md5(inputString) {
    if (!isString(inputString))
        inputString = JSON.stringify(inputString, replacer)

    var hc = "0123456789abcdef"
    function rh(n) {
        var j,
            s = ""
        for (j = 0; j <= 3; j++)
            s +=
                hc.charAt((n >> (j * 8 + 4)) & 0x0f) +
                hc.charAt((n >> (j * 8)) & 0x0f)
        return s
    }
    function ad(x, y) {
        var l = (x & 0xffff) + (y & 0xffff)
        var m = (x >> 16) + (y >> 16) + (l >> 16)
        return (m << 16) | (l & 0xffff)
    }
    function rl(n, c) {
        return (n << c) | (n >>> (32 - c))
    }
    function cm(q, a, b, x, s, t) {
        return ad(rl(ad(ad(a, q), ad(x, t)), s), b)
    }
    function ff(a, b, c, d, x, s, t) {
        return cm((b & c) | (~b & d), a, b, x, s, t)
    }
    function gg(a, b, c, d, x, s, t) {
        return cm((b & d) | (c & ~d), a, b, x, s, t)
    }
    function hh(a, b, c, d, x, s, t) {
        return cm(b ^ c ^ d, a, b, x, s, t)
    }
    function ii(a, b, c, d, x, s, t) {
        return cm(c ^ (b | ~d), a, b, x, s, t)
    }
    function sb(x) {
        var i
        var nblk = ((x.length + 8) >> 6) + 1
        var blks = new Array(nblk * 16)
        for (i = 0; i < nblk * 16; i++) blks[i] = 0
        for (i = 0; i < x.length; i++)
            blks[i >> 2] |= x.charCodeAt(i) << ((i % 4) * 8)
        blks[i >> 2] |= 0x80 << ((i % 4) * 8)
        blks[nblk * 16 - 2] = x.length * 8
        return blks
    }
    var i,
        x = sb("" + inputString),
        a = 1732584193,
        b = -271733879,
        c = -1732584194,
        d = 271733878,
        olda,
        oldb,
        oldc,
        oldd
    for (i = 0; i < x.length; i += 16) {
        olda = a
        oldb = b
        oldc = c
        oldd = d
        a = ff(a, b, c, d, x[i + 0], 7, -680876936)
        d = ff(d, a, b, c, x[i + 1], 12, -389564586)
        c = ff(c, d, a, b, x[i + 2], 17, 606105819)
        b = ff(b, c, d, a, x[i + 3], 22, -1044525330)
        a = ff(a, b, c, d, x[i + 4], 7, -176418897)
        d = ff(d, a, b, c, x[i + 5], 12, 1200080426)
        c = ff(c, d, a, b, x[i + 6], 17, -1473231341)
        b = ff(b, c, d, a, x[i + 7], 22, -45705983)
        a = ff(a, b, c, d, x[i + 8], 7, 1770035416)
        d = ff(d, a, b, c, x[i + 9], 12, -1958414417)
        c = ff(c, d, a, b, x[i + 10], 17, -42063)
        b = ff(b, c, d, a, x[i + 11], 22, -1990404162)
        a = ff(a, b, c, d, x[i + 12], 7, 1804603682)
        d = ff(d, a, b, c, x[i + 13], 12, -40341101)
        c = ff(c, d, a, b, x[i + 14], 17, -1502002290)
        b = ff(b, c, d, a, x[i + 15], 22, 1236535329)
        a = gg(a, b, c, d, x[i + 1], 5, -165796510)
        d = gg(d, a, b, c, x[i + 6], 9, -1069501632)
        c = gg(c, d, a, b, x[i + 11], 14, 643717713)
        b = gg(b, c, d, a, x[i + 0], 20, -373897302)
        a = gg(a, b, c, d, x[i + 5], 5, -701558691)
        d = gg(d, a, b, c, x[i + 10], 9, 38016083)
        c = gg(c, d, a, b, x[i + 15], 14, -660478335)
        b = gg(b, c, d, a, x[i + 4], 20, -405537848)
        a = gg(a, b, c, d, x[i + 9], 5, 568446438)
        d = gg(d, a, b, c, x[i + 14], 9, -1019803690)
        c = gg(c, d, a, b, x[i + 3], 14, -187363961)
        b = gg(b, c, d, a, x[i + 8], 20, 1163531501)
        a = gg(a, b, c, d, x[i + 13], 5, -1444681467)
        d = gg(d, a, b, c, x[i + 2], 9, -51403784)
        c = gg(c, d, a, b, x[i + 7], 14, 1735328473)
        b = gg(b, c, d, a, x[i + 12], 20, -1926607734)
        a = hh(a, b, c, d, x[i + 5], 4, -378558)
        d = hh(d, a, b, c, x[i + 8], 11, -2022574463)
        c = hh(c, d, a, b, x[i + 11], 16, 1839030562)
        b = hh(b, c, d, a, x[i + 14], 23, -35309556)
        a = hh(a, b, c, d, x[i + 1], 4, -1530992060)
        d = hh(d, a, b, c, x[i + 4], 11, 1272893353)
        c = hh(c, d, a, b, x[i + 7], 16, -155497632)
        b = hh(b, c, d, a, x[i + 10], 23, -1094730640)
        a = hh(a, b, c, d, x[i + 13], 4, 681279174)
        d = hh(d, a, b, c, x[i + 0], 11, -358537222)
        c = hh(c, d, a, b, x[i + 3], 16, -722521979)
        b = hh(b, c, d, a, x[i + 6], 23, 76029189)
        a = hh(a, b, c, d, x[i + 9], 4, -640364487)
        d = hh(d, a, b, c, x[i + 12], 11, -421815835)
        c = hh(c, d, a, b, x[i + 15], 16, 530742520)
        b = hh(b, c, d, a, x[i + 2], 23, -995338651)
        a = ii(a, b, c, d, x[i + 0], 6, -198630844)
        d = ii(d, a, b, c, x[i + 7], 10, 1126891415)
        c = ii(c, d, a, b, x[i + 14], 15, -1416354905)
        b = ii(b, c, d, a, x[i + 5], 21, -57434055)
        a = ii(a, b, c, d, x[i + 12], 6, 1700485571)
        d = ii(d, a, b, c, x[i + 3], 10, -1894986606)
        c = ii(c, d, a, b, x[i + 10], 15, -1051523)
        b = ii(b, c, d, a, x[i + 1], 21, -2054922799)
        a = ii(a, b, c, d, x[i + 8], 6, 1873313359)
        d = ii(d, a, b, c, x[i + 15], 10, -30611744)
        c = ii(c, d, a, b, x[i + 6], 15, -1560198380)
        b = ii(b, c, d, a, x[i + 13], 21, 1309151649)
        a = ii(a, b, c, d, x[i + 4], 6, -145523070)
        d = ii(d, a, b, c, x[i + 11], 10, -1120210379)
        c = ii(c, d, a, b, x[i + 2], 15, 718787259)
        b = ii(b, c, d, a, x[i + 9], 21, -343485551)
        a = ad(a, olda)
        b = ad(b, oldb)
        c = ad(c, oldc)
        d = ad(d, oldd)
    }
    return rh(a) + rh(b) + rh(c) + rh(d)
}

export {
    d,
    isNull,
    isBool,
    isString,
    isNumber,
    isArray,
    isObject,
    isFunction,
    isInt,
    isInRange,
    isValidJson,
    isEventInRect,
    clamp,
    round,
    getPathInfo,
    getPathParams,
    extractFullClasses,
    ClassNames,
    Attributes,
    cloneDeep,
    apply,
    rgb2hex,
    md5
}
