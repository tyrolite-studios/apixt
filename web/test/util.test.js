import { getStringifiedJSON } from "../src/util"

test('returns false and logs error when myJson is null', () => {
    console.error = jest.fn();
    expect(getStringifiedJSON(null, 2)).toBe(false);
    expect(console.error).toHaveBeenCalledWith('myJson is not allowed to be null');
});

test('returns false and logs error when myJson is neither object nor valid JSON string', () => {
    console.error = jest.fn();
    expect(getStringifiedJSON(123, 2)).toBe(false);
    expect(console.error).toHaveBeenCalledWith('invalid myJson type! Given type was: number');
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
    const jsonStr = JSON5.stringify(jsonObject, null, 2);
    JSON5.stringify = jest.fn().mockReturnValue(jsonStr);

    getTypeOfStringValue.mockImplementation(value => {
        switch (typeof value) {
            case 'string': return 'string';
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'object': return value === null ? 'null' : (Array.isArray(value) ? 'array' : 'object');
            default: return 'unknown';
        }
    });

    const result = getStringifiedJSON(jsonObject, 2);

    // Überprüfen des formatierten Outputs
    expect(JSON5.stringify).toHaveBeenCalledWith(jsonObject, null, 2);
    
    // Überprüfen von Strings
    expect(result).toContain('<span class="COLOR_CLS_KEY">"string"</span> : <span class="COLOR_CLS_STR">"value"</span>');
    // Überprüfen von Zahlen
    expect(result).toContain('<span class="COLOR_CLS_KEY">"number"</span> : <span class="COLOR_CLS_NUM">123</span>');
    // Überprüfen von Booleans
    expect(result).toContain('<span class="COLOR_CLS_KEY">"boolean"</span> : <span class="COLOR_CLS_BOOL">true</span>');
    // Überprüfen von Null-Werten
    expect(result).toContain('<span class="COLOR_CLS_KEY">"nullValue"</span> : <span class="COLOR_CLS_NULL">null</span>');
    // Überprüfen von Objekten
    expect(result).toContain('<span class="COLOR_CLS_KEY">"object"</span> : {');
    expect(result).toContain('<span class="COLOR_CLS_KEY">"nested"</span> : <span class="COLOR_CLS_STR">"object"</span>');
    // Überprüfen von Arrays
    expect(result).toContain('<span class="COLOR_CLS_KEY">"array"</span> : [');
    expect(result).toContain('<span class="COLOR_CLS_STR">"item1"</span>');
    expect(result).toContain('<span class="COLOR_CLS_STR">"item2"</span>');
});