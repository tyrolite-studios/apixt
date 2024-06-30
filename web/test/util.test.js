import { example } from "../src/util"

test('example', () => {
    expect(example()).toBeUndefined()
    expect(example(100)).toEqual(100)
    expect(example({foo: 'bar'})).toEqual({foo: 'bar'})
})