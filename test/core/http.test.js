import {
    getQueryStringForJson,
    getParsedQueryString
} from "../../src/core/http"

test("Query string: json -> string -> json", () => {
    const dataset = [
        { x: "foo" },
        { x: ["a", "b", "c"] },
        { x: ["1", ["2", "3"]] },
        { x: [{ x: "a", y: "b" }] },
        { x: { x: ["a", "b"], y: ["b"] } }
    ]
    for (const data of dataset) {
        const qs = getQueryStringForJson(data)
        const json = getParsedQueryString(qs)
        expect(json).toEqual(data)
    }
})
