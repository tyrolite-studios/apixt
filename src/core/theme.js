import defaultTheme from "themes/default"
import { isInt, isString, d } from "./helper"

const root = document.documentElement

const cssConstTypes = [
    "px",
    "rem",
    "rgb",
    "rgba",
    "px",
    "urls",
    "url",
    "font",
    "bstyle",
    "float",
    "perc",
    "grad",
    "type"
]

const key2type = {}
const key2const = {}

const extractKeys2types = (obj) => {
    for (let typedKey of Object.keys(obj)) {
        const mainParts = typedKey.split("_")
        if (mainParts.length !== 2) continue

        const [key, type] = mainParts
        if (!type || !cssConstTypes.includes(type)) continue

        key2type[typedKey] = type

        const parts = []
        let i = 0
        let currPart = ""
        while (i < key.length) {
            let char = key[i]
            if (char >= "A" && char <= "Z") {
                parts.push(currPart)
                currPart = ""
                char = char.toLowerCase()
            }
            currPart += char
            i++
        }
        if (currPart !== "") {
            parts.push(currPart)
        }
        const constName = "--" + parts.join("-")
        key2const[typedKey] = constName
    }
}

extractKeys2types(defaultTheme)

let currentTheme = null
let backup = null
let storage = null

const manager = {
    init: () => {
        storage = window.controller.globalStorage
        if (!storage) throw Error(`No global storage found`)

        currentTheme = { ...defaultTheme }
        const storedTheme = storage.getJson("theme")
        if (storedTheme) {
            for (const [key, value] of Object.entries(storedTheme)) {
                const defaultValue = defaultTheme[key]

                if (defaultValue) {
                    let valid = defaultTheme[key] === undefined
                    switch (key2type[key]) {
                        case "px":
                            valid = isInt(value)
                            break

                        case "rgb":
                            valid = isString(value)
                            break
                    }
                    if (!valid) {
                        console.log(
                            `Invalid value "${value}" for theme key "${key}" using default "${defaultValue}" instead`
                        )
                        value = defaultValue
                    }
                }
                currentTheme[key] = value
            }
        }
        manager.apply(currentTheme)
    },

    store: () => {
        storage.setJson("theme", currentTheme)
    },

    applyProp: (key, value, elem = root) => {
        const cssConst = key2const[key]
        const type = key2type[key]
        if (!cssConst || !type) return

        let dim = ["px", "rem"].includes(type) ? type : ""

        elem.style.setProperty(cssConst, value + dim)
        if (elem === root) {
            currentTheme[key] = value
        }
    },

    apply: (theme, elem = root) => {
        for (const [key, value] of Object.entries(theme)) {
            manager.applyProp(key, value, elem)
        }
    },

    applyBackup: (elem) => {
        if (backup !== null) throw Error(`Cannot store multiple theme backups`)

        backup = { ...currentTheme }
        manager.apply(backup, elem)
    },

    deleteBackup: () => {
        backup = null
    },

    restoreBackup: () => {
        manager.apply(backup)
        backup = null
    },

    get currentTheme() {
        return currentTheme
    },

    get defaultTheme() {
        return defaultTheme
    }
}

export default manager
