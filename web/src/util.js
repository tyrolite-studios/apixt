const COLOR_CLS = { num: 'crimson', null: 'blue', bool: 'purple', str: 'maroon',  key: 'teal', default: 'black'}

const typeToClass = {
    'boolean': COLOR_CLS.bool,
    'number': COLOR_CLS.num,
    'string': COLOR_CLS.str,
    'object': COLOR_CLS.default,
}

/**
 * Returns the stringified JSON with Syntax Highlighting
 * @param {object | Array} myJson The Object to stringify.
 * @returns {string} The stringified Object.
 */
const getStringifiedJSON = (myJson, indentation) => {
    if (myJson === undefined) {
        return undefined
    }
    const stringifiedJSON = JSON.stringify(myJson, null, indentation)
    let lines = stringifiedJSON.split('\n')
    lines = lines.map(line => {
        //These are the indexes where a Quotiation Escape happens
        const escapeIndexes = [...line.trim().matchAll(/\\"/gm)].map(a => a.index)

        const end = line.endsWith(',') ? ',' : ''
        line = end === ',' ? line.substring(0, line.length-1) : line
        if (['{', '[', ']', '}'].includes(line.trim())) return line + end //To avoid the opening/closing brackets in further code

        const keyVal = line.split(':')
        if (keyVal.length === 1) {
            const type = getTypeOfStringValue(line)
            const cls = (type === 'object' && line.trim() === 'null') ? COLOR_CLS.null : typeToClass[type]
            return '<span class="' + cls +'">' + line + '</span>' + end
        }
        if (keyVal.length >= 2) {
            let key = ''
            let value = ''
            let keyIndex
            const possibleEndOfKeys = keyVal.filter(val => val.endsWith('"'))
            if (possibleEndOfKeys.length > 1) {
                /*
                Incase there are multiple Quotiation Marks inside a string before a ":" it handles that problem by checking if the found 
                Quotiation mark is at one of the escape positions or not. If it is, it gets ignored.
                */
                let differenceInLength = 2
                let position = 0
                for (const end of possibleEndOfKeys) {
                    position += end.trim().length
                    if (!escapeIndexes.includes(position - differenceInLength)) {
                        keyIndex = keyVal.indexOf(end) 
                        break
                    }
                    differenceInLength--
                }
            } else {
                keyIndex = keyVal.indexOf(possibleEndOfKeys[0])
            }
            key = '<span class="' + COLOR_CLS.key + '">' + keyVal.slice(0, keyIndex+1).join(':') + ':</span>'
            value = keyVal.slice(keyIndex+1).join(':')
            if (!['{', '['].includes(keyVal[1].trim())) {
                const type = getTypeOfStringValue(value)
                const cls = (type === 'object' && value.trim() === 'null') ? COLOR_CLS.null : typeToClass[type]
                value = ' <span class="' + cls +'">' + value  + '</span>' + end
            }
            return key + value
        }
    })
    return lines.join('\n')
}

/**
 * Returns the type of the value of the string
 * @param {string} str The string to evaluate.
 * @returns {string} The type of the evaluated string.
 */
const getTypeOfStringValue = (str) => {
    str = str.toLowerCase().trim()
    if (/^-?\d+\.?\d*$/.test(str)) { 
        return typeof 1
    } else if (/^(true|false)$/.test(str)) {
        return typeof true
    } else if (/null/.test(str)) {
        return typeof null
    }
    try { 
        const parsed = JSON.parse(str) 
        if (typeof parsed === 'object') {
            return typeof {}
        } 
    } catch(e) {}

    return typeof ""
}
 
export {
    getStringifiedJSON,
    getTypeOfStringValue,
    COLOR_CLS
}