import {
    extractBool, extractNull, extractNumber, extractSpaces, extractString
} from '../src/tokenizer'

const testExtractor = (name, extractor, cases) => {
    test(`Test extractor "${name}"`, () => {
        for (const [ input, expected ] of Object.entries(cases)) {
            if (expected === null) {
                expect(() => extractor(input)).toThrow()
            } else {
                expect(extractor(input)).toEqual(expected)
            }
        }
    })
}

testExtractor('extractNull', extractNull, {
    '': null,
    'x': null,
    ' null': null,
    'null': 'null',
    'NULL': 'NULL',
    'NULLnull': 'NULL'
})

testExtractor('extractSpaces', extractSpaces, {
    'a': null,
    ' ': ' ',
    '\t': '\t',
    '\n': '\n',
    ' \n\t ': ' \n\t ',
    ' 2 ': ' '
})


testExtractor('extractBool', extractBool, {
    '': null,
    ' true': null,
    'true': 'true',
    'TRUE': 'TRUE',
    'TRUETRUE': 'TRUE',
    'false': 'false',
    'FALSE': 'FALSE'
})

testExtractor('extractNumber', extractNumber, {
    '': null,
    '.': null,
    '- 1': null,
    'E10': null,
    '0.': '0.',
    '1': '1',
    '-1': '-1',
    '1..': '1.',
    '1E': '1',
    '0': '0',
    '0.1': '0.1',
    '0.255e3 ': '0.255e3',
    '0.255e-3 ': '0.255e-3',
    '-0.255e3': '-0.255e3',
    '0.255E+3 ': '0.255E+3',
    '-0.255E+3': '-0.255E+3'
})


testExtractor('extractString', extractString, {
    '': null,
    'a': null,
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
    '"  \\u0000\\uffff"': '"  \\u0000\\uffff"',
})
