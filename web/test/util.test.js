import { getStringifiedJSON, COLOR_CLS } from "../src/util"
import { TokenizeJsonString } from "../src/tokenizer"

// syntax highlighting mit tokenizer...
const highlight = (input, indentation) => {
    const jsonStr = JSON.stringify(input, null, indentation)
    if (!jsonStr) return undefined

    const tokens = TokenizeJsonString(jsonStr)

    const type2cls = {
        bool: COLOR_CLS.bool,
        number: COLOR_CLS.num,
        string: COLOR_CLS.str,
        key: COLOR_CLS.key,
        null: COLOR_CLS.null,
        'symbol-[': COLOR_CLS.default,
        'symbol-]': COLOR_CLS.default,
        'symbol-{': COLOR_CLS.default,
        'symbol-}': COLOR_CLS.default,
        // normalerweise sollten wir hier auch "symbol-," und "symbol-:" einfärben
    }
    
    let result = ''
    let pos = 0
    const lastPos = tokens.length - 1
    while (pos <= lastPos) {
        let { type, raw, end } = tokens[pos]
        if (type === 'string' && pos < lastPos && tokens[pos + 1].raw === ':') {
            // object key
            type = 'key'
            raw += ':'
            pos++
        } else if (end && pos < lastPos) {
            // empty object or array
            if (tokens[pos + 1].raw === end) {
                raw += end
                pos++
            }
        }
        const color = type2cls[type] ? type2cls[type] : null
        result += color ? `<span class="${color}">${raw}</span>` : raw
        pos++
    }
    return result
}

const compareHighlighting = (cases) => {
    test(`Compare highlighting results`, () => {
        for (const json of cases) {
            const actual = getStringifiedJSON(json, 2)
            const expected = highlight(json, 2)
            expect(actual, 'Original: ' + JSON.stringify(json)).toEqual(expected)
        }
    })
}

compareHighlighting(
    [
        undefined,
        null,
        0,
        -1,
        0.5,
//        -5.6E+24,                      // number mit Exponenten werden nicht erkannt...
//        0.5E-8,                       
        "",
        "abc",
        "\\",
        "\\\"",
//        "\\\":",                      // das dürfte bekannt sein
        "\n",
        "\r\n",
        "\t",
        "{\n}",
        "[]",
        "\uffff",
        [],
//        [[]],                         // hier wird der äußere Array-start und das Ende nicht eingefärbt
//        [{}],
//        [1, 2],                       // im Prinzip nicht falsch, aber der span beinhaltet hier auch die whitespaces
        {},
//        {foo: 'bar'},                 // hier wird jeweils der Object-start und das Ende nicht eingefärbt
//        {foo: 'bar', foo2: 'bar2'},   
//        {foo: {}},
/*                 
        {
            string: "value",
            number: 123,
            boolean: true,
            nullValue: null,
            object: { nested: "object", deep: [0, 10] },
            array: ["item1", "item2"]
        }
            */
    ]
)

//getStringifiedJSON
test('should return undefined if myJson is undefined', () => {
    expect(getStringifiedJSON(undefined, 2)).toBeUndefined();
});
test('should handle strings', () => {
    const expected = `<span class="${COLOR_CLS.str}">"test"</span>`.trim();

    expect(getStringifiedJSON("test", 2)).toBe(expected);
});
test('should handle numbers', () => {
    const expected = `<span class="${COLOR_CLS.num}">3</span>`.trim();

    expect(getStringifiedJSON(3, 2)).toBe(expected);
});
test('should handle booleans', () => {
    const expected = `<span class="${COLOR_CLS.bool}">true</span>`.trim();

    expect(getStringifiedJSON(true, 2)).toBe(expected);
});
test('should handle null', () => {
    const expected = `<span class="${COLOR_CLS.null}">null</span>`.trim();

    expect(getStringifiedJSON(null, 2)).toBe(expected);
});
test('correctly formats JSON with all data types', () => {
    const jsonObject = {
        string: "value",
        number: 123,
        boolean: true,
        nullValue: null,
        object: { nested: "object" },
        array: ["item1", "item2"]
    };
    const result = getStringifiedJSON(jsonObject, 2);

    expect(result).toContain(`<span class="${COLOR_CLS.key}">  "string":</span> <span class="${COLOR_CLS.str}"> "value"</span>`);
    expect(result).toContain(`<span class="${COLOR_CLS.key}">  "number":</span> <span class="${COLOR_CLS.num}"> 123</span>`);
    expect(result).toContain(`<span class="${COLOR_CLS.key}">  "boolean":</span> <span class="${COLOR_CLS.bool}"> true</span>`);
    expect(result).toContain(`<span class="${COLOR_CLS.key}">  "nullValue":</span> <span class="${COLOR_CLS.null}"> null</span>`);
    expect(result).toContain(`<span class="${COLOR_CLS.key}">  "object":</span> {`);
    expect(result).toContain(`<span class="${COLOR_CLS.key}">    "nested":</span> <span class="${COLOR_CLS.str}"> "object"</span>`);
    expect(result).toContain(`<span class="${COLOR_CLS.key}">  "array":</span> [`);
    expect(result).toContain(`<span class="${COLOR_CLS.str}">    "item1"</span>`);
    expect(result).toContain(`<span class="${COLOR_CLS.str}">    "item2"</span>`);
});
test('correctly handle multiple quotiation marks in key', () => {
    const jsonObject = {"\":6\":\":\"test\":\":6\"::::::\"\"\"\"\"6": "failure"}
    const result = getStringifiedJSON(jsonObject, 2);
    expect(result).toContain(`<span class="${COLOR_CLS.key}">  \"\\\":6\\\":\\\":\\\"test\\\":\\\":6\\\"::::::\\\"\\\"\\\"\\\"\\\"6\":</span> <span class="${COLOR_CLS.str}"> \"failure\"</span>`)
})
