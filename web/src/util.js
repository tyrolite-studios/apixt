// Definiere die Konstanten für die Klassen
const COLOR_CLS_BOOL = 'BOOL';
const COLOR_CLS_NUM = 'NUM';
const COLOR_CLS_NULL = 'NULL';
const COLOR_CLS_STR = 'STR';
const COLOR_CLS_DEFAULT = 'DEFAULT';

const COLOR_CLS = { NUM: 'red', NULL: 'blue', BOOL: 'purple', STR: 'maroon',  KEY: 'teal'}

const typeToClass = {
    'boolean': COLOR_CLS_BOOL,
    'number': COLOR_CLS_NUM,
    'undefined': COLOR_CLS_NULL,
    'string': COLOR_CLS_STR,
    'object': COLOR_CLS_DEFAULT,
};

/**
 * Returns the stringified JSON with Syntax Highlighting
 * @param {object | Array} myJson The Object to stringify.
 * @returns {string} The stringified Object.
 */
const getStringifiedJSON = (myJson, indentation) => {
    if (myJson === undefined) {
        throw Error("Caution! myJson is undefined");
    }
    const stringifiedJSON = JSON.stringify(myJson, null, indentation)
    let lines = stringifiedJSON.split('\n')
    lines = lines.map(line => {
        const end = line.endsWith(',') ? ',' : ''
        line = end === ',' ? line.substring(0, line.length-1) : line
        if (['{', '[', ']', '}'].includes(line.trim())) return line + end //To avoid the opening/closing brackets in further code
        const keyVal = line.split(':')
        if (keyVal.length === 1) {
            const type = getTypeOfStringValue(line)
            return '<span class="' + typeToClass[type] +'">' + line + '</span>' + end
        }
        if (keyVal.length === 2) {
            keyVal[0] = '<span class="COLOR_CLS_KEY">' + keyVal[0] + '</span>'
            if (!['{', '['].includes(keyVal[1].trim())) {
                const type = getTypeOfStringValue(keyVal[1])
                keyVal[1] = '<span class="' + typeToClass[type] +'">' + keyVal[1] + '</span>' + end
            }
            return keyVal.join(' : ')
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
    if (/^\d+$/.test(str)) {
        return typeof 1
    } else if (/true|false/.test(str)) {
        return typeof true
    } else if (/null|undefined/.test(str)) {
        return typeof undefined
    }
    try { 
        const parsed = JSON.parse(str) 
        if (typeof parsed === 'object' && parsed !== null) {
            return typeof {};
        } 
    } catch(e) {}

    return typeof ""
}
 
export {
    getStringifiedJSON,
    getTypeOfStringValue,
    COLOR_CLS
}