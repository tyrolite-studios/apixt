import { getStringifiedJSON, COLOR_CLS } from "../src/util"

const colorToValues = {
    [COLOR_CLS.null]: [null],
    [COLOR_CLS.num]: [0, -1, 0.5, -5.6e24, 0.5e-8],
    [COLOR_CLS.str]: [
        "",
        "abc",
        "\\",
        '\\"',
        '\\":',
        "\n",
        "\r\n",
        "\t",
        "{\n}",
        "[]",
        "\uffff"
    ],
    [COLOR_CLS.default]: [
        [],
        [[]],
        [{}],
        [1, 2],
        {},
        { foo: "bar" },
        { foo: "bar", foo2: "bar2" },
        { foo: {} }
    ]
}

test("first token color should match", () => {
    for (const [color, values] of Object.entries(colorToValues)) {
        const expected = `<span class="${color}">`
        for (const value of values) {
            expect(
                getStringifiedJSON(value, 2).substring(0, expected.length)
            ).toBe(expected)
        }
    }
})

//getStringifiedJSON
test("should return undefined if myJson is undefined", () => {
    expect(getStringifiedJSON(undefined, 2)).toBeUndefined()
})
test("should handle strings", () => {
    const expected = `<span class="${COLOR_CLS.str}">"test"</span>`.trim()

    expect(getStringifiedJSON("test", 2)).toBe(expected)
})
test("should handle numbers", () => {
    const expected = `<span class="${COLOR_CLS.num}">3</span>`.trim()

    expect(getStringifiedJSON(3, 2)).toBe(expected)
})
test("should handle booleans", () => {
    const expected = `<span class="${COLOR_CLS.bool}">true</span>`.trim()

    expect(getStringifiedJSON(true, 2)).toBe(expected)
})
test("should handle null", () => {
    const expected = `<span class="${COLOR_CLS.null}">null</span>`.trim()

    expect(getStringifiedJSON(null, 2)).toBe(expected)
})
test("correctly formats JSON with all data types", () => {
    const jsonObject = {
        string: "value",
        number: 123,
        boolean: true,
        nullValue: null,
        object: { nested: "object" },
        array: ["item1", "item2"]
    }
    const result = getStringifiedJSON(jsonObject, 2)

    expect(result).toContain(
        `  <span class="${COLOR_CLS.key}">"string"</span><span class="${COLOR_CLS.default}">:</span> <span class="${COLOR_CLS.str}">"value"</span>`
    )
    expect(result).toContain(
        `  <span class="${COLOR_CLS.key}">"number"</span><span class="${COLOR_CLS.default}">:</span> <span class="${COLOR_CLS.num}">123</span>`
    )
    expect(result).toContain(
        `  <span class="${COLOR_CLS.key}">"boolean"</span><span class="${COLOR_CLS.default}">:</span> <span class="${COLOR_CLS.bool}">true</span>`
    )
    expect(result).toContain(
        `  <span class="${COLOR_CLS.key}">"nullValue"</span><span class="${COLOR_CLS.default}">:</span> <span class="${COLOR_CLS.null}">null</span>`
    )
    expect(result).toContain(
        `  <span class="${COLOR_CLS.key}">"object"</span><span class="${COLOR_CLS.default}">:</span> <span class="${COLOR_CLS.default}">{</span>`
    )
    expect(result).toContain(
        `    <span class="${COLOR_CLS.key}">"nested"</span><span class="${COLOR_CLS.default}">:</span> <span class="${COLOR_CLS.str}">"object"</span>`
    )
    expect(result).toContain(
        `  <span class="${COLOR_CLS.key}">"array"</span><span class="${COLOR_CLS.default}">:</span> <span class="${COLOR_CLS.default}">[</span>`
    )
    expect(result).toContain(
        `    <span class="${COLOR_CLS.str}">"item1"</span>`
    )
    expect(result).toContain(
        `    <span class="${COLOR_CLS.str}">"item2"</span>`
    )
})
test("correctly handle multiple quotiation marks in key", () => {
    const jsonObject = { '":6":":"test":":6"::::::"""""6': "failure" }
    const result = getStringifiedJSON(jsonObject, 2)
    expect(result).toContain(
        `<span class="${COLOR_CLS.key}">\"\\\":6\\\":\\\":\\\"test\\\":\\\":6\\\"::::::\\\"\\\"\\\"\\\"\\\"6\"</span><span class="${COLOR_CLS.default}">:</span> <span class="${COLOR_CLS.str}">\"failure\"</span>`
    )
})
