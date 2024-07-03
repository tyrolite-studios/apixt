import { getStringifiedJSON, getTypeOfStringValue } from "../src/util"

//getStringifiedJSON
test('should throw error if myJson is undefined', () => {
    expect(() => getStringifiedJSON(undefined, 2)).toThrow('Caution! myJson is undefined');
});
test('should handle strings', () => {
    const expected = `<span class="maroon">"test"</span>`.trim();

    expect(getStringifiedJSON("test", 2)).toBe(expected);
});
test('should handle numbers', () => {
    const expected = `<span class="red">3</span>`.trim();

    expect(getStringifiedJSON(3, 2)).toBe(expected);
});
test('should handle booleans', () => {
    const expected = `<span class="purple">true</span>`.trim();

    expect(getStringifiedJSON(true, 2)).toBe(expected);
});
test('should handle null', () => {
    const expected = `<span class="blue">null</span>`.trim();

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

    expect(result).toContain('<span class=\"teal\">  \"string\"</span> : <span class=\"maroon\"> \"value\"</span>');
    expect(result).toContain('<span class=\"teal\">  \"number\"</span> : <span class=\"red\"> 123</span>');
    expect(result).toContain('<span class=\"teal\">  \"boolean\"</span> : <span class=\"purple\"> true</span>');
    expect(result).toContain('<span class=\"teal\">  \"nullValue\"</span> : <span class=\"blue\"> null</span>');
    expect(result).toContain('<span class=\"teal\">  \"object\"</span> :  {');
    expect(result).toContain('<span class=\"teal\">    \"nested\"</span> : <span class=\"maroon\"> \"object\"</span>');
    expect(result).toContain('<span class=\"teal\">  \"array\"</span> :  [');
    expect(result).toContain('<span class=\"maroon\">    \"item1\"</span>');
    expect(result).toContain('<span class=\"maroon\">    \"item2\"</span>');
});
