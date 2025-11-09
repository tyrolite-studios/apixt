import { d } from "./helper.js"

const FILTER = {
    RESULT: {
        FLAT_DIRECT: 1,
        FLAT_SUBTREES: 2,
        SUBTREES: 3,
        WITH_ANCESTORS: 4
    },
    MODE: {
        EXACT: 'exact',
        INCLUDES: 'includes',
        PREFIX: 'startsWith',
        SUFFIX: 'endsWith'
    },
    CONTROL: {
        CASE_SENSITIVE: 1,
        OR: 2,
        MODE: 4
    },
    MATCH: {
        LEAFS: node => node.nodeType === 'leaf',
        FOLDERS: node => node.nodeType === 'folder',
        ALL: () => true
    },
}
FILTER.DEFAULTS = {
    caseSensitive: false,
    or: false,
    not: false,
    mode: FILTER.MODE.INCLUDES,
    result: FILTER.RESULT.SUBTREES,
    isFilterRelevant: FILTER.MATCH.ALL,
    isFilterVisible: FILTER.MATCH.ALL
}
FILTER.SETS = {
    ALL: {
        id: 'all', name: 'All', exclusive: true
    },
    MARKED: {
        id: 'marked',
            name: 'Marked',
            result: FILTER.RESULT.FLAT_DIRECT,
            exclusive: true,
            getHasId: ({ selection }) => id => selection && selection.includes(id)
    }
}

const getWords = (value, toLowerCase = false) => {
    let searchWords = value.split(' ').filter(part => part.trim() !== '')
    if (!searchWords.length) return []

    return toLowerCase ? searchWords.map(word => word.toLowerCase()) : searchWords
}

const hasMatch = (searchWord, itemWords, mode = FILTER.MODE.INCLUDES) => {
    const someHandler = mode === FILTER.MODE.EXACT ?
        itemWord => itemWord === searchWord : itemWord => itemWord[mode](searchWord)

    return itemWords.some(someHandler)
}

const isSearchWordsMatch = (searchWords, parts, options) => {
    const { caseSensitive = FILTER.DEFAULTS.caseSensitive, mode, or = FILTER.DEFAULTS.or, not = FILTER.DEFAULTS.not } = options
    if (!searchWords.length) return true

    let itemWords = parts.map(word => getWords(word, !caseSensitive)).filter(part => part.length).flat()
    if (!itemWords.length) return false

    let hasOneMatch = false
    for (const word of searchWords) {
        if (not && word[0] === '!') {
            if (word.length > 1 && hasMatch(word.substring(1), itemWords, mode)) {
                return false
            }
            continue
        }

        if (!hasMatch(word, itemWords, mode)) {
            if (!or) return false
        } else if (or) {
            hasOneMatch = true
        }
    }
    return !or || hasOneMatch
}

const isStringMatch = (searchString, parts, options) => {
    const searchWords = getWords(searchString, !options.caseSensitive)
    return isSearchWordsMatch(searchWords, parts, options)
}

export {
    FILTER,
    getWords,
    isSearchWordsMatch,
    isStringMatch
}