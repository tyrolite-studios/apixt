import { getWords, isStringMatch } from "../../src/core/filter.js"

test("getWords()", () => {
    let data = {
        '': [],
        '   ': [],
        'a': ['a'],
        'A': ['a'],
        '  a': ['a'],
        '  A': ['a'],
        'a b': ['a', 'b'],
        'A B': ['a', 'b'],
        'a   b': ['a', 'b'],
        'A   B': ['a', 'b'],
        ' a  bc d  ': ['a', 'bc', 'd'],
        ' A  Bc D  ': ['a', 'bc', 'd']
    }
    for (const [input, expected] of Object.entries(data)) {
        expect(getWords(input, true)).toEqual(expected)
    }

    data = {
        'a': ['a'],
        'A': ['A'],
        '  a': ['a'],
        '  A': ['A'],
        'a b': ['a', 'b'],
        'A B': ['A', 'B'],
        'a   b': ['a', 'b'],
        'A   B': ['A', 'B'],
        ' a  bc d  ': ['a', 'bc', 'd'],
        ' A  Bc D  ': ['A', 'Bc', 'D']
    }
    for (const [input, expected] of Object.entries(data)) {
        expect(getWords(input, false)).toEqual(expected)
    }
})

test("isStringMatch()", () => {
    let options = {caseSensitive: false}
    expect(isStringMatch('', [], options)).toEqual(true)
    expect(isStringMatch('', [''], options)).toEqual(true)
    expect(isStringMatch('', ['', '   '], options)).toEqual(true)
    expect(isStringMatch('', ['x', 'y'], options)).toEqual(true)

    expect(isStringMatch('x', [], options)).toEqual(false)
    expect(isStringMatch('x', [''], options)).toEqual(false)
    expect(isStringMatch('x', ['', '  '], options)).toEqual(false)
    expect(isStringMatch('xoo', ['x', 'oo', 'y'], options)).toEqual(false)
    expect(isStringMatch('  xoo  ', ['xo'], options)).toEqual(false)
    expect(isStringMatch('!', ['!'], options)).toEqual(true)
    expect(isStringMatch('!foo', ['!fool'], options)).toEqual(true)
    expect(isStringMatch('!f', ['a', 'f'], options)).toEqual(false)
    expect(isStringMatch('!f', ['a', 'f', '!f'], options)).toEqual(true)

    expect(isStringMatch('xo', ['xo'], options)).toEqual(true)
    expect(isStringMatch('  xo  ', ['xo'], options)).toEqual(true)
    expect(isStringMatch('xo', ['    xo  '], options)).toEqual(true)
    expect(isStringMatch('xo', ['oxo'], options)).toEqual(true)
    expect(isStringMatch('xo', ['xoo'], options)).toEqual(true)
    expect(isStringMatch('xo', ['x', 'yxoo', 'y'], options)).toEqual(true)

    expect(isStringMatch('xo y', ['x', 'yxoo', 'y'], options)).toEqual(true)
    expect(isStringMatch('xo y z', ['x', 'yxoo', 'y'], options)).toEqual(false)

    options = {caseSensitive: true}
    expect(isStringMatch('x', [], options)).toEqual(false)
    expect(isStringMatch('x', [''], options)).toEqual(false)
    expect(isStringMatch('x', ['', '  '], options)).toEqual(false)
    expect(isStringMatch('x', ['X'], options)).toEqual(false)
    expect(isStringMatch('X', ['x'], options)).toEqual(false)
    expect(isStringMatch('xoo', ['x', 'oo', 'y'], options)).toEqual(false)
    expect(isStringMatch('xoo', ['x', 'Xoo', 'y'], options)).toEqual(false)
    expect(isStringMatch('  xoo  ', ['xo'], options)).toEqual(false)

    expect(isStringMatch('xo', ['xo'], options)).toEqual(true)
    expect(isStringMatch('XO', ['XO'], options)).toEqual(true)
    expect(isStringMatch('  xo  ', ['xo'], options)).toEqual(true)
    expect(isStringMatch('  Xo  ', ['Xo'], options)).toEqual(true)
    expect(isStringMatch('xo', ['    xo  '], options)).toEqual(true)
    expect(isStringMatch('xO', ['    xO  '], options)).toEqual(true)
    expect(isStringMatch('xo', ['oxo'], options)).toEqual(true)
    expect(isStringMatch('Xo', ['oXo'], options)).toEqual(true)
    expect(isStringMatch('xo', ['xoo'], options)).toEqual(true)
    expect(isStringMatch('Xo', ['Xoo'], options)).toEqual(true)
    expect(isStringMatch('xo', ['x', 'yxoo', 'y'], options)).toEqual(true)
    expect(isStringMatch('Xo', ['x', 'xo', 'yXoo', 'y'], options)).toEqual(true)

    expect(isStringMatch('xo y', ['x', 'yxoo', 'y'], options)).toEqual(true)
    expect(isStringMatch('xo Y', ['x', 'Yxoo', 'y'], options)).toEqual(true)
    expect(isStringMatch('xo y z', ['x', 'yxoo', 'y'], options)).toEqual(false)
    expect(isStringMatch('xo y Z', ['x', 'yxoo', 'z', 'y'], options)).toEqual(false)

    options = {or: true}
    expect(isStringMatch('a B', ['b'], options)).toEqual(true)
    expect(isStringMatch('a b  ', ['bx'], options)).toEqual(true)
    expect(isStringMatch('a b  ', ['  yb  '], options)).toEqual(true)
    expect(isStringMatch('a x', ['b'], options)).toEqual(false)
    expect(isStringMatch('a x', [''], options)).toEqual(false)

    options = {not: true}
    expect(isStringMatch('!', ['a',], options)).toEqual(true)
    expect(isStringMatch('!a', ['b'], options)).toEqual(true)
    expect(isStringMatch('!A', ['b'], options)).toEqual(true)
    expect(isStringMatch('!a', ['B'], options)).toEqual(true)
    expect(isStringMatch('!a', ['a',], options)).toEqual(false)
    expect(isStringMatch('!A', ['a',], options)).toEqual(false)
    expect(isStringMatch('!a', ['A',], options)).toEqual(false)
    expect(isStringMatch('!a', ['b', 'a',], options)).toEqual(false)
    expect(isStringMatch('!A', ['b', 'a',], options)).toEqual(false)
    expect(isStringMatch('!a', ['b', 'A',], options)).toEqual(false)

    expect(isStringMatch('a !B', ['b'], options)).toEqual(false)
    expect(isStringMatch('b !b', ['b'], options)).toEqual(false)
    expect(isStringMatch('b !c', ['b'], options)).toEqual(true)
    expect(isStringMatch('b !b', ['b'], options)).toEqual(false)
    expect(isStringMatch('a !b !c', ['d', 'a'], options)).toEqual(true)
    expect(isStringMatch('a !b !c', ['c', 'a'], options)).toEqual(false)
    expect(isStringMatch('a ! !c', ['d', 'a'], options)).toEqual(true)
    expect(isStringMatch('a ! !c', ['xa', 'a'], options)).toEqual(true)

    options = {not: true, or: true, caseSensitive: true}
    expect(isStringMatch('a !b', ['b'], options)).toEqual(false)
    expect(isStringMatch('a b !b', ['b'], options)).toEqual(false)
    expect(isStringMatch('a b !b', ['a'], options)).toEqual(true)
    expect(isStringMatch('a b !b', ['x'], options)).toEqual(false)
    expect(isStringMatch('a !B', ['b'], options)).toEqual(false)
    expect(isStringMatch('b !b', ['b'], options)).toEqual(false)
    expect(isStringMatch('b !c', ['b'], options)).toEqual(true)
    expect(isStringMatch('b !b', ['b'], options)).toEqual(false)
    expect(isStringMatch('d a !b !c', ['d', 'a'], options)).toEqual(true)
    expect(isStringMatch('d a !b !c', ['c', 'a'], options)).toEqual(false)
    expect(isStringMatch('x a ! !c', ['d', 'a'], options)).toEqual(true)
    expect(isStringMatch('a ! !c', ['xa', 'a'], options)).toEqual(true)
})