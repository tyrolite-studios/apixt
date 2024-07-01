// Definiere die Konstanten für die Klassen
const COLOR_CLS_BOOL = 'BOOL';
const COLOR_CLS_NUM = 'NUM';
const COLOR_CLS_NULL = 'NULL';
const COLOR_CLS_STR = 'STR';
const COLOR_CLS_DEFAULT = 'DEFAULT';

const JSON_SYNTAX_TYPE_CLASS_MAPPING = {
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
    if (myJson === null) {
        console.error('myJson is not allowed to be null')
        return false
    }
    //Incase the input is not an object
    if (typeof myJson !== 'object') {
        //Incase the input is a JSON string
        if (typeof myJson === 'string') {
            try {
                myJson = JSON5.parse(myJson)
            } catch(err) {
                console.error(err)
                return false
            }
        } else {
            console.error('invalid myJson type! Given type was: ' + typeof myJson)
            return false
        }
    }
    let stringifiedJSON = JSON5.stringify(myJson, null, indentation)
    let lines = stringifiedJSON.split('\n')
    lines = lines.map(line => {
        const end = line.endsWith(',') ? ',' : ''
        line = line.trim()
        line = end === ',' ? line.substring(0, line.length-1) : line
        if (['{', '[', ']', '}'].includes(line)) return line + end //To avoid the opening/closing brackets in further code
        const keyVal = line.split(':')
        if (keyVal.length === 1) {
            const type = getTypeOfStringValue(line)
            return '<span class="COLOR_CLS_' + JSON_SYNTAX_TYPE_CLASS_MAPPING[type] +'">' + line + '</span>' + end
        }
        if (keyVal.length === 2) {
            keyVal[0] = '<span class="COLOR_CLS_KEY">' + keyVal[0] + '</span>'
            keyVal[1] = keyVal[1].trim()
            if (!['{', '['].includes(keyVal[1])) {
                const type = getTypeOfStringValue(keyVal[1])
                keyVal[1] = '<span class="COLOR_CLS_' + JSON_SYNTAX_TYPE_CLASS_MAPPING[type] +'">' + keyVal[1] + '</span>' + end
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
    COLOR_CLS_BOOL,
    COLOR_CLS_NUM,
    COLOR_CLS_NULL,
    COLOR_CLS_STR,
    COLOR_CLS_DEFAULT
}