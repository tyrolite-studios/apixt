export default {
    verbose: true,
    setupFilesAfterEnv: ["./test/setup.js", "jest-expect-message"],
    testEnvironment: "node",
    testRegex: "test/.*\\.test\\.js$",
    transform: {},
    globals: {},
    moduleNameMapper: {}
}
