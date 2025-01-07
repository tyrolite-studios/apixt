import {
    extractBool,
    extractNull,
    extractNumber,
    extractSpaces,
    extractString,
    getStringifiedJSON,
    COLOR_CLS
} from "../../../src/plugins/syntax-highlighter/helper"

const testExtractor = (name, extractor, cases) => {
    test(`Test extractor "${name}"`, () => {
        for (const [input, expected] of Object.entries(cases)) {
            if (expected === null) {
                expect(() => extractor(input)).toThrow()
            } else {
                expect(extractor(input)).toEqual(expected)
            }
        }
    })
}

testExtractor("extractNull", extractNull, {
    "": null,
    x: null,
    " null": null,
    null: "null",
    NULL: "NULL",
    NULLnull: "NULL"
})

testExtractor("extractSpaces", extractSpaces, {
    a: null,
    " ": " ",
    "\t": "\t",
    "\n": "\n",
    " \n\t ": " \n\t ",
    " 2 ": " "
})

testExtractor("extractBool", extractBool, {
    "": null,
    " true": null,
    true: "true",
    TRUE: "TRUE",
    TRUETRUE: "TRUE",
    false: "false",
    FALSE: "FALSE"
})

testExtractor("extractNumber", extractNumber, {
    "": null,
    ".": null,
    "- 1": null,
    E10: null,
    "0.": "0.",
    1: "1",
    "-1": "-1",
    "1..": "1.",
    "1E": "1",
    0: "0",
    0.1: "0.1",
    "0.255e3 ": "0.255e3",
    "0.255e-3 ": "0.255e-3",
    "-0.255e3": "-0.255e3",
    "0.255E+3 ": "0.255E+3",
    "-0.255E+3": "-0.255E+3"
})

testExtractor("extractString", extractString, {
    "": null,
    a: null,
    "'": null,
    '"': null,
    '"x': null,
    '"\\"': null,
    '"\\x"': null,
    '"\\\'"': null,
    '"\\u"': null,
    '"\\u0"': null,
    '"\\u00"': null,
    '"\\u000"': null,
    '"\\uf0fg"': null,
    '"\\uf0ff': null,
    '"\\uf0f\\uFFFF"': null,
    '""': '""',
    '"a"': '"a"',
    '"a"a': '"a"',
    '"\\\\"': '"\\\\"',
    '"\\b"': '"\\b"',
    '"\\f"': '"\\f"',
    '"\\n"': '"\\n"',
    '"\\r"': '"\\r"',
    '"\\t"': '"\\t"',
    '"\\""': '"\\""',
    '"\t"': '"\t"',
    '"\b"': '"\b"',
    '"\f"': '"\f"',
    '"\n"': '"\n"',
    '"\r"': '"\r"',
    '"\t"': '"\t"',
    '"\\uf0f0"': '"\\uf0f0"',
    '"\\uF0f0"': '"\\uF0f0"',
    '"\\uabcd"': '"\\uabcd"',
    '"\\uefAB"': '"\\uefAB"',
    '"\\uCDEF"': '"\\uCDEF"',
    '"\\u0123"': '"\\u0123"',
    '"\\u4567"': '"\\u4567"',
    '"\\u8999"': '"\\u8999"',
    '"\\u00000"': '"\\u00000"',
    '"\\u0000g"': '"\\u0000g"',
    '"  \\u0000\\uffff"': '"  \\u0000\\uffff"'
})

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
