import { getStringifiedJSON, getTypeOfStringValue } from "../src/util"

//getStringifiedJSON
test('should throw error if myJson is undefined', () => {
    expect(() => getStringifiedJSON(undefined, 2)).toThrow('Caution! myJson is undefined');
});
test('should handle strings', () => {
    const expected = `<span class="STR">"test"</span>`.trim();

    expect(getStringifiedJSON("test", 2)).toBe(expected);
});
test('should handle numbers', () => {
    const expected = `<span class="NUM">3</span>`.trim();

    expect(getStringifiedJSON(3, 2)).toBe(expected);
});
test('should handle booleans', () => {
    const expected = `<span class="BOOL">true</span>`.trim();

    expect(getStringifiedJSON(true, 2)).toBe(expected);
});
test('should handle null', () => {
    const expected = `<span class="NULL">null</span>`.trim();

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

    expect(result).toContain('<span class=\"COLOR_CLS_KEY\">  \"string\"</span> : <span class=\"STR\"> \"value\"</span>');
    expect(result).toContain('<span class=\"COLOR_CLS_KEY\">  \"number\"</span> : <span class=\"NUM\"> 123</span>');
    expect(result).toContain('<span class=\"COLOR_CLS_KEY\">  \"boolean\"</span> : <span class=\"BOOL\"> true</span>');
    expect(result).toContain('<span class=\"COLOR_CLS_KEY\">  \"nullValue\"</span> : <span class=\"NULL\"> null</span>');
    expect(result).toContain('<span class=\"COLOR_CLS_KEY\">  \"object\"</span> :  {');
    expect(result).toContain('<span class=\"COLOR_CLS_KEY\">    \"nested\"</span> : <span class=\"STR\"> \"object\"</span>');
    expect(result).toContain('<span class=\"COLOR_CLS_KEY\">  \"array\"</span> :  [');
    expect(result).toContain('<span class=\"STR\">    \"item1\"</span>');
    expect(result).toContain('<span class=\"STR\">    \"item2\"</span>');
});
