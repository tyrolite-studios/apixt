import path from "node:path"

const baseDir = path.resolve(import.meta.dirname)

export default {
    verbose: true,
    setupFilesAfterEnv: ["./test/setup.js", "jest-expect-message"],
    testEnvironment: "node",
    testRegex: "test/.*\\.test\\.js$",
    transform: {},
    globals: {},
    moduleNameMapper: {
        "^core(.*)$": path.resolve(baseDir, "src/core$1"),
        "^components(.*)$": path.resolve(baseDir, "src/components$1"),
        "^plugins(.*)$": path.resolve(baseDir, "src/plugins$1"),
        "^themes(.*)$": path.resolve(baseDir, "src/themes$1"),
        "^entities(.*)$": path.resolve(baseDir, "src/entities$1")
    }
}
