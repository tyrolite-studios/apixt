const example = x => x

const getStringifiedJSON = (myJson, indentation) => {
    return JSON.stringify(myJson, null, indentation)
}
const isValidJson = (str) => {
    let parsed
    try { 
        parsed = JSON.parse(str)
    } catch(e) {
        console.error("json error")
        console.log({str})
        return false 
    }
    return parsed 
}

export {
    example, getStringifiedJSON, isValidJson
}