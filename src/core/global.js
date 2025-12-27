const skipPrefix = "@webpack-internal:///./"

globalThis.d = (main, ...params) => {
    let stack = []
    try {
        throw Error("foo")
    } catch (e) {
        stack = e.stack.split("\n")
    }
    const func = []
    for (const line of stack) {
        if (line.startsWith('globalThis.d')) continue

        if (func.length === 0) {
            func.push(line.trim().replace(skipPrefix, "@"))
            continue
        }
        if (func.length > 5) break

        const [first] = line.split("(")
        const code = first.trim().replace(skipPrefix, "@")
        func.push(code)
    }
    console.group("Debug " + func.join(" <- "))
    console.log(main, ...params)
    console.groupEnd()

    return main
}