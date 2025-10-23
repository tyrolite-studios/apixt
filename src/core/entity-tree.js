import { d, sortAsc } from "./helper"
import { MappingIndex } from "./entity.js"
import { FILTER, getWords, isSearchWordsMatch } from "./filter.js"

const getSkipHandler = (skip) => {
    let skipLevel = null

    return {
        addFile: (node) => {
            if (skipLevel === null && !skip("leaf " + node.value)) return

            return node.level > skipLevel
        },
        addFolder: (node) => {
            if (skipLevel !== null) {
                if (node.level > skipLevel) return true

                skipLevel = null
            }
            if (skip && skip("folder " + node.value)) {
                skipLevel = node.level
                return true
            }
        }
    }
}

// sets: pathNames
// requires: index, value, folder, name
const getAddPathNamesHandler = () => {

    const value2path = new Map()
    value2path.set("", [])

    return {
        addFile: (node) => {
            node.pathNames = value2path.get('' + node.folder)
        },
        addFolder: (node) => {
            const path = value2path.get('' + (node.folder ?? '')) ?? []
            value2path.set("" + node.value, node.index > -1 ? [...path, node.name] : [])
            node.pathNames = path
        }
    }
}

const getMarkedAncestorHandler = (selection) => {
    const markedFolders = []
    const markedFiles = []

    for (const id of selection) {
        const [type, value] = id.split(" ");
        (type === 'leaf' ? markedFiles : markedFolders).push(value)
    }

    let markedLevel = null
    const checkNode = (node, marked) => {
        if (markedLevel !== null && node.level <= markedLevel) markedLevel = null

        if (markedLevel === null) {
            if (marked.includes(node.value)) markedLevel = node.level
        } else {
            node.markedAncestor = true
        }
    }

    return {
        addFile: (node) => {
            checkNode(node, markedFiles)
        },
        addFolder: (node) => {
            checkNode(node, markedFolders)
        }
    }
}

const getIsMatch = (tree, filter, inSet, options = {}) => {
    const searchWords = getWords(filter, !options.caseSensitive)
    const { globals } = tree

    const isInSet = !inSet ? () => true : node => inSet(node.nodeType + ' ' + node.value)

    if (!filter) return (node) => isInSet(node)

    return (node) => isInSet(node) && options.isFilterRelevant(node) && isSearchWordsMatch(
        searchWords,
        [
            (node.nodeType === 'leaf' ? globals.leafIndex : globals.folderIndex).getEntityFilterString(node.index) ?? '',
            ...(options.pathMatch ? node.pathNames ?? [] : [])
        ],
        options
    )
}

const getAncestorFilterProcessor = (filter, inSet, options = {}) => {
    return (tree) => {
        const isMatch = getIsMatch(tree, filter, inSet, options)
        const { isFilterVisible } = options
        const nodes = tree.nodes
        let i = nodes.length - 1
        let matchLevel = null
        const result = []
        while (i >= 0) {
            const node = nodes[i]
            let isNextMatchParent = matchLevel !== null && node.level === matchLevel
            if (isNextMatchParent && !isFilterVisible(node)) {
                isNextMatchParent = false
                for (const node of result) {
                    if (node.viewLevel === 1) break

                    node.viewLevel = node.level - matchLevel
                }
                matchLevel = null

            }
            const match = isNextMatchParent || isMatch(node)
            if (match) {
                matchLevel = node.level - 1
            }
            if (!match || !isFilterVisible(node)) {
                node.visible = false
                node.inView = false
            }
            result.unshift(node)
            i--
        }
        tree.nodes = result
    }
}

const getListFilterProcessor = (filter, inSet, options = {}) => {
    return (tree) => {
        const { isFilterVisible } = options
        const isMatch = getIsMatch(tree, filter, inSet, options)
        const nodes = tree.nodes
        const isVisible = filter ? isFilterVisible : () => true
        for (const node of nodes) {
            if (!isMatch(node) || !isVisible(node)) {
                node.visible = false
                node.inView = false
            } else {
                node.viewLevel = 1
            }
        }
    }
}

const getSubtreeFilterProcessor = (filter, inSet, options = {}) => {
    return (tree) => {
        const nodes = tree.nodes
        let matchLevel = null
        let ignoreLevel = null
        const { isFilterVisible } = options
        const isMatch = getIsMatch(tree, filter, inSet, options)
        const treeStack = [{level: 0, nodes: []}]
        const popTrees = (level = 0) => {
            let currTree = !treeStack.length ? undefined : treeStack[treeStack.length - 1]
            while (currTree && currTree.level >= level) {
                backLog.push(...currTree.nodes)
                treeStack.pop()
                currTree = !treeStack.length ? undefined : treeStack[treeStack.length - 1]
            }
        }

        const backLog = []
        const result = []

        for (const node of nodes) {
            if (matchLevel !== null && node.level <= matchLevel) {
                matchLevel = null
            }
            if (matchLevel === null && isMatch(node)) {
                matchLevel = node.level
            }
            if (matchLevel === null) {
                node.visible = false
                node.inView = false
                result.push(node)
                continue
            }

            // we are in the match tree
            popTrees(node.level)
            let currTree = treeStack[treeStack.length - 1]

            let newTreeVisibility = null
            if (!isFilterVisible(node)) {
                if (currTree.visible) {
                    newTreeVisibility = false
                }
                node.visible = false
                node.inView = false
            } else if (!currTree.visible) {
                newTreeVisibility = true
            }
            if (newTreeVisibility !== null) {
                const newTree = {level: node.level, nodes: [], visible: newTreeVisibility}
                treeStack.push(newTree)
                node.parent = '0'
                currTree = newTree
            }

            // push node
            node.viewLevel =
                currTree ? (node.level - currTree.level) + 1 : node.level

            /*
            if (node.level === matchLevel) {
                d(node).viewLevel = 1
            }
             */
            currTree.nodes.push(node)
        }
        popTrees()
        result.push(...backLog)
        tree.nodes = result
    }
}

const getCollapseProcessor = (alwaysExpanded) => {
    return (tree) => {
        let closedLevel = null
        let closedIndex = null

        for (const [index, node] of tree.nodes.entries()) {
            if (!node.visible) continue

            if (node.nodeType === 'leaf') {
                if (!alwaysExpanded &&
                    closedLevel !== null &&
                    node.viewLevel > closedLevel) {
                    node.visible = false
                    node.closedBy = closedIndex
                }
                continue
            }
            // folder
            if (alwaysExpanded) {
                node.closed = false
                continue
            }
            if (closedLevel !== null) {
                if (node.viewLevel > closedLevel) {
                    node.visible = false
                    node.closedBy = closedIndex
                    continue
                }
                closedLevel = null
            }
            if (node.closed) {
                closedLevel = node.viewLevel
                closedIndex = index
            }
        }
    }
}

// requires: value, inView, visible, level
// sets: markedHidden
const getMarkedProcessor = (selection) => {
    return (tree) => {
        const markedFolders = []
        const markedFiles = []

        for (const id of selection) {
            const [type, value] = id.split(" ");
            (type === 'leaf' ? markedFiles : markedFolders).push(value)
        }
        let notInViewFiles = new Set(markedFiles)
        let notInViewFolders = new Set(markedFolders)

        let markedLevel = null

        for (const node of tree.nodes) {
            if (node.nodeType === 'leaf') {
                if (!node.inView || !notInViewFiles.has(node.value)) continue

                if (node.closedBy !== undefined) {
                    tree.nodes[node.closedBy].markedHidden++
                }
                notInViewFiles.delete(node.value)
                continue
            }
            if (!node.inView || !notInViewFolders.has(node.value)) continue

            if (!node.closedBy !== undefined && !node.visible) {
                tree.nodes[node.closedBy].markedHidden++
            }
            notInViewFolders.delete(node.value)
        }
        tree.globals.markedOutside = notInViewFiles.size + notInViewFolders.size
    }
}

const ROOT_FOLDER_ID = "0"

class FolderIndex extends MappingIndex {
    constructor(model, props = [] ) {
        super(model, ["name", "parent", "closed", "path", ...props])
        this.value2path = {}
        this.filterProps = ['name']
    }

    getEntityPropValue(index, prop) {
        if (prop === "path") {
            let value = this.items[index]
            const cached = this.value2path[value]
            if (cached !== undefined) return cached

            const path = []
            let curr = index
            do {
                const parent = this.getEntityPropValue(curr, "parent")

                if (parent === undefined) break

                path.unshift(parent)
                curr = this.getEntityByPropValue("value", parent)
            } while (curr)
            this.value2path[value] = path

            return path
        }
        return super.getEntityPropValue(index, prop)
    }

    setEntityPropValue(index, prop, value) {
        if (prop === "path") return

        if (prop === "parent") {
            this.value2path = {}
        }
        return super.setEntityPropValue(index, prop, value)
    }

    getAutoProps() {
        return ["path"]
    }

    doUpdates(...args) {
        super.doUpdates(...args)
        this.value2path = {}
    }

    getFolderName(value) {
        if (value === ROOT_FOLDER_ID) return ""

        const index = this.getEntityByPropValue("value", value)
        if (index === null) return ""

        return this.getEntityPropValue(index, "name")
    }

    getFolderPathNames(value) {
        const path = []
        let currIndex = this.getEntityByPropValue("value", value)
        while (currIndex !== null) {
            const parent = this.getEntityPropValue(currIndex, "parent")
            if (!parent || parent === ROOT_FOLDER_ID) break

            currIndex = this.getEntityByPropValue("value", parent)
            if (currIndex === null) break

            path.unshift(this.getEntityPropValue(currIndex, "name"))
        }
        return path
    }
}

class TreeIndex {
    constructor(folderIndex, leafIndex, options = {}) {
        const { parentProp = "folder", sortDir = 1 } = options

        this.lastModified = Date.now()
        this.folderIndex = folderIndex
        this.leafIndex = leafIndex
        this.parentProp = parentProp
        this.sortDir = sortDir

        this.folderSort = (a, b) => {
            const pathA = [
                ...folderIndex.getEntityPropValue(a, "path"),
                folderIndex.getEntityPropValue(a, "value")
            ]
            const pathB = [
                ...folderIndex.getEntityPropValue(b, "path"),
                folderIndex.getEntityPropValue(b, "value")
            ]
            let i = 0
            while (
                i < pathA.length &&
                i < pathB.length &&
                pathA[i] === pathB[i]
                )
                i++

            const hasPathA = i < pathA.length
            const hasPathB = i < pathB.length

            let compA
            let compB
            if (hasPathA) {
                if (!hasPathB) return 1

                compA = folderIndex.model[pathA[i]].name
                compB = folderIndex.model[pathB[i]].name
            } else if (hasPathB) {
                return -1
            } else {
                compA = folderIndex.getEntityPropValue(a, "name")
                compB = folderIndex.getEntityPropValue(b, "name")
            }
            compA = compA.toLowerCase()
            compB = compB.toLowerCase()
            return (compA < compB ? -1 : compA > compB ? 1 : 0) * this.sortDir
        }

        folderIndex.addListener(() => {
            this.rebuildFolderSortIds()
            this.notify()
        })
        leafIndex.addListener(() => this.notify())
        this.rebuildFolderSortIds()
    }

    addListener(listener) {
        if (!this.listeners) {
            this.listeners = []
        }
        this.listeners.push(listener)
    }

    removeListener(listener) {
        if (!this.listeners) {
            return
        }
        if (this.listeners.includes(listener)) {
            this.listeners.splice(this.listeners.indexOf(listener), 1)
        }
    }

    notify() {
        this.lastModified = Date.now()
        if (this.suspendNotifications) {
            return false
        }
        this._allIndices = null
        if (!this.listeners) {
            return true
        }
        for (let listener of this.listeners) {
            listener(this.updates)
        }
        this.updates = []
        return true
    }

    rebuildFolderSortIds() {
        const folder2sortId = {}
        const index2sortId = {}
        const folderIndex = this.folderIndex
        const sorted = folderIndex.allIndices.toSorted(this.folderSort)
        for (const [sortIndex, sortedIndex] of sorted.entries()) {
            index2sortId[sortedIndex] = sortIndex
            const value = folderIndex.getEntityPropValue(sortedIndex, "value")
            folder2sortId[value] = sortIndex
        }
        this.folder2sortId = folder2sortId
        this.index2sortId = index2sortId
    }

    toggleFolder(index) {
        const closed = this.folderIndex.getEntityPropValue(index, "closed")
        this.folderIndex.setEntityPropValue(index, "closed", !closed)
    }

    collapseAll(match) {
        const folders = this.folderIndex.getView({match})
        for (const index of folders.matches) {
            this.folderIndex.setEntityPropValue(index, "closed", true)
        }
    }

    expandAll(match) {
        const folders = this.folderIndex.getView({match})
        for (const index of folders.matches) {
            this.folderIndex.setEntityPropValue(index, "closed", false)
        }
    }

    toggleSortDir() {
        this.sortDir = -this.sortDir
        this.rebuildFolderSortIds()
        this.notify()
    }

    getFolderTreeNodes(delFolder, match, found = { files: [], folders: [] }) {
        const { nodes } = this.getNodes({ alwaysExpanded: true,
            match
        })
        const { files, folders } = found
        let level = null
        for (const node of nodes) {
            if (level === null) {
                if (node.index !== delFolder || node.nodeType === 'leaf') continue

                level = node.level
                if (!folders.includes(node.index)) folders.push(node.index)
                continue
            }
            if (node.level <= level) {
                break
            }
            if (node.nodeType === 'leaf') {
                if (!files.includes(node.index)) files.push(node.index)
            } else {
                if (!folders.includes(node.index)) folders.push(node.index)
            }
        }
        return found
    }

    getNodes({ alwaysExpanded = false, filter, inSet, filterOptions = {}, selection, skip, ...props } = {}) {

        const options = { ...FILTER.DEFAULTS, ...filterOptions }
        const globals = {
            leafIndex: this.leafIndex,
            folderIndex: this.folderIndex
        }

        // extract relevant files
        const fileMatch = !props.match
            ? undefined
            : index => {
                // TODO: check this especially why we use "file" instead of "leaf"
                return props.match("file", this.leafIndex, index)
            }

        // get all files but ordered by folders
        const filesView = this.leafIndex.getView({
            match: fileMatch,
            sort: (a, b) => {
                const folderA = this.leafIndex.getEntityPropValue(a, "folder")
                const folderB = this.leafIndex.getEntityPropValue(b, "folder")

                let compA
                let compB
                if (filter || folderA === folderB) {
                    compA = this.leafIndex
                        .getEntityPropValue(a, "name")
                        .toLowerCase()
                    compB = this.leafIndex
                        .getEntityPropValue(b, "name")
                        .toLowerCase()
                } else {
                    compA = this.folder2sortId[folderA]
                    compB = this.folder2sortId[folderB]
                }
                return (
                    (compA < compB ? -1 : compA > compB ? 1 : 0) * this.sortDir
                )
            }
        })
        // build file nodes with all props
        const fileNodes = this.leafIndex.getEntityObjects(filesView.unfiltered)

        const folder2files = {}
        for (const {
            index,
            name,
            value,
            folder = "0",
            ...props
        } of fileNodes) {
            if (!folder2files[folder]) {
                folder2files[folder] = []
            }
            if (skip && skip('leaf ' + value)) continue

            folder2files[folder].push({
                nodeType: "leaf",
                index,
                folder,
                name,
                value,
                inView: true,
                visible: true,
                ...props
            })
        }

        const folderMatch = !props.match
            ? undefined
            : (index) => {
                return props.match("folder", this.folderIndex, index)
            }
        const folders = this.folderIndex.getView({
            match: folderMatch,
            sort: (a, b) => {
                const compA = this.index2sortId[a]
                const compB = this.index2sortId[b]
                return compA < compB ? -1 : compA === compB ? 0 : 1
            }
        })
        const isFlat = [FILTER.RESULT.FLAT_DIRECT, FILTER.RESULT.FLAT_SUBTREES].includes(options.result)
        const preHandlers = []
        if (skip)
            preHandlers.push(getSkipHandler(skip))
        if (isFlat || filter) {
            preHandlers.push(getAddPathNamesHandler())
        }

        const isFiltered = filter || inSet;

        const postProcessors = []
        if (isFiltered) {
            let filterProcessor = null
            if (isFlat) {
                filterProcessor = getListFilterProcessor
            } else {
                filterProcessor = options.result === FILTER.RESULT.WITH_ANCESTORS ?
                    getAncestorFilterProcessor :
                    getSubtreeFilterProcessor
            }
            postProcessors.push(
                filterProcessor(
                    filter ?? '',
                    inSet,
                    {
                        ...options,
                        pathMatch: [FILTER.RESULT.WITH_ANCESTORS, FILTER.RESULT.FLAT_SUBTREES].includes(options.result)
                    }
                )
            )
        }
        if (!(isFiltered && isFlat)) {
            postProcessors.push(getCollapseProcessor(alwaysExpanded))
        }
        if (selection) {
            preHandlers.push(getMarkedAncestorHandler(selection))
            postProcessors.push(getMarkedProcessor(selection))
        }
        if (filter && isFlat) {
            postProcessors.push((tree) => {
                tree.nodes.sort(
                    (a, b) => sortAsc(a.name, b.name) * this.sortDir
                )
            })
        }

        const results = []

        const popFoldersAboveLevel = (targetLevel) => {
            while (idStack.length > targetLevel) {
                const lastFolder = idStack.pop()
                const folderNode = folderStack.pop()
                const files = folder2files[lastFolder]
                if (folderNode.level < tree.rootLevel) {
                    results.push(...tree.nodes)
                    tree = treeStack.pop()
                } else if (folderNode.level === 0) {
                    tree.nodes.push(...results.flat())
                }
                if (files) {
                    const level = idStack.length + 1
                    for (const file of files) {
                        const fileNode = { nodeType: 'leaf', level, viewLevel: level, ...file }
                        let skip = false
                        for (const handler of preHandlers) {
                            if (handler.addFile(fileNode)) {
                                skip = true
                                break
                            }
                        }
                        if (!skip) tree.nodes.push(fileNode)
                    }
                }
                if (!idStack.length) {
                    results.push(tree.nodes)
                    break
                }
            }
        }

        const rootFolder = {
            name: "",
            path: [],
            value: "0",
            index: -1,
            level: 0,
            closed: false
        }
        let tree = {
            nodes: [],
            globals,
            rootLevel: 0
        }
        const idStack = []
        const folderStack = []
        const treeStack = []

        const folderNodes = this.folderIndex.getEntityObjects(folders.unfiltered)
        folderNodes.unshift(rootFolder)
        for (const node of folderNodes) {
            let folderNode, level
            if (node.index !== -1) {
                const idx = idStack.indexOf("" + (node.parent ?? 0))
                level = idx !== -1 ? idx + 1 : idStack.length
                if (idx !== -1) {
                    popFoldersAboveLevel(level)
                }
                folderNode = {
                    nodeType: 'folder',
                    level,
                    viewLevel: level,
                    folder: node.parent ?? '0',
                    visible: true,
                    inView: true,
                    markedHidden: 0,
                    ...node
                }
            } else {
                folderNode = rootFolder
                level = 0
            }
            idStack.push("" + node.value)
            folderStack.push(folderNode)
            let aborted = false
            for (const handler of preHandlers) {
                aborted = handler.addFolder(folderNode)
                if (aborted) break
            }
            if (!aborted && node.value !== '0') tree.nodes.push(folderNode)
        }
        popFoldersAboveLevel(-1)
        const treeOrder = [ ...tree.nodes ]
        for (const processor of postProcessors) {
            processor(tree)
        }

        return {nodes: tree.nodes, treeOrder, markedOutside: globals.markedOutside ?? 0}
    }
}

export {
    FILTER,
    ROOT_FOLDER_ID,
    TreeIndex,
    FolderIndex,
    getCollapseProcessor,
    getSubtreeFilterProcessor,
    getAncestorFilterProcessor,
    getListFilterProcessor,
    getMarkedProcessor,
    getAddPathNamesHandler
}
