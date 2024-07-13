const example = (x) => x

const getStringifiedJSON = (myJson, indentation) => {
    return JSON.stringify(myJson, null, indentation)
}
const isValidJson = (str) => {
    let parsed
    try {
        parsed = JSON.parse(str)
    } catch (e) {
        console.error("json error")
        console.log({ str })
        return false
    }
    return parsed
}

const requestHeaderOptions = {
    "A-IM": "string",
    Accept: "string",
    "Accept-Charset": "string",
    "Accept-Datetime": "string",
    "Accept-Encoding": "string",
    "Accept-Language": "string",
    "Access-Control-Request-Method": "string",
    "Access-Control-Request-Headers": "string",
    Authorization: "string",
    "Cache-Control": "string",
    Connection: "string",
    "Content-Length": "number",
    "Content-MD5": "string",
    "Content-Type": "string",
    Cookie: "string",
    Date: "string",
    Expect: "string",
    Forwarded: "string",
    From: "string",
    Host: "string",
    "If-Match": "string",
    "If-Modified-Since": "string",
    "If-None-Match": "string",
    "If-Range": "string",
    "If-Unmodified-Since": "string",
    "Max-Forwards": "number",
    Origin: "string",
    Pragma: "string",
    "Proxy-Authorization": "string",
    Range: "string",
    Referer: "string",
    TE: "string",
    Trailer: "string",
    "Transfer-Encoding": "string",
    "User-Agent": "string",
    Upgrade: "string",
    Via: "string",
    Warning: "string",
    DNT: "string",
    "Upgrade-Insecure-Requests": "string",
    "X-Requested-With": "string",
    "X-Forwarded-For": "string",
    "X-Forwarded-Host": "string",
    "X-Forwarded-Proto": "string",
    "Front-End-Https": "string",
    "X-HTTP-Method-Override": "string",
    "X-Frame-Options": "string",
    "X-Content-Type-Options": "string",
    "X-XSS-Protection": "string",
    "X-RateLimit-Limit": "number",
    "X-RateLimit-Remaining": "number",
    "X-RateLimit-Reset": "number",
    "X-Correlation-ID": "string",
    "X-Request-ID": "string"
}

//Not all available types.. Maybe just use for recommendation
const headerContentTypes = [
    "application/json",
    "application/xml",
    "application/x-www-form-urlencoded",
    "application/javascript",
    "application/pdf",
    "application/zip",
    "application/octet-stream",
    "application/ld+json",
    "application/vnd.api+json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/x-www-form-urlencoded",
    "application/x-tar",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "audio/mpeg",
    "audio/wav",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "multipart/form-data",
    "text/html",
    "text/plain",
    "text/css",
    "text/javascript",
    "text/xml",
    "text/csv",
    "text/markdown",
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/ogg"
]

export {
    example,
    getStringifiedJSON,
    isValidJson,
    requestHeaderOptions,
    headerContentTypes
}
