import {
    getCollapseProcessor,
    getMarkedProcessor,
    getListFilterProcessor,
    getSubtreeFilterProcessor,
    getAncestorFilterProcessor,
    getAddPathNamesHandler,
    TreeIndex, FolderIndex, ROOT_FOLDER_ID, FILTER
} from "../../src/core/entity-tree.js"
import { d } from "../../src/core/helper.js"
import { MappingIndex } from "../../src/core/entity.js"

test("getAddPathNamesHandler()", () => {
    let tree = {}
    let handler = getAddPathNamesHandler(tree)

    // file with undefined pathNames
    let node = {folder: 'bar'}
    expect(handler.addFile(node)).toBeUndefined()
    expect(node.pathNames).toBeUndefined()

    // file with empty pathNames
    handler = getAddPathNamesHandler(tree)
    node = {folder: ''}
    expect(handler.addFile(node)).toBeUndefined()
    expect(node.pathNames).toEqual([])

    // file with single pathName
    handler = getAddPathNamesHandler(tree)
    expect(handler.addFolder({value: 'foo', name: 'bar', index: 0}))
    node = {folder: 'foo'}
    expect(handler.addFile(node)).toBeUndefined()
    expect(node.pathNames).toEqual(['bar'])

    // root folder
    handler = getAddPathNamesHandler(tree)
    // globals.value2path = new Map([['', []]])
    node = {index: -1, value: '0'}
    expect(handler.addFolder(node)).toBeUndefined()
    expect(node.pathNames).toEqual([])
    // expect(globals.value2path.get('0')).toEqual([])

    // sub-root folder
    handler = getAddPathNamesHandler(tree)
    // globals.value2path = new Map([['', []], ['0', []]])
    node = {index: 1, value: 'foo', name: 'bar'}
    expect(handler.addFolder(node))
    expect(node.pathNames).toEqual([])
    node = {index: 2, name: "bar2", value: 'foo2', folder: 'foo'}
    expect(handler.addFolder(node)).toBeUndefined()
    expect(node.pathNames).toEqual(['bar'])

    // expect(globals.value2path.get('foo')).toEqual([])

    // deep folder and file
    handler = getAddPathNamesHandler(tree)
    handler.addFolder({value: 'foo', name: 'bar', index: 1})
    node = {index: 2, name: "bar2", value: 'foo2', folder: 'foo'}
    expect(handler.addFolder(node)).toBeUndefined()
    expect(node.pathNames).toEqual(['bar'])
    node = {index: 2, folder: "foo2"}
    expect(handler.addFile(node)).toBeUndefined()
    expect(node.pathNames).toEqual(['bar', 'bar2'])
})

test("getCollapseProcessor", () => {

    const getTestData = (tree, alwaysExpanded) => {

        const nodes = getTreeTestData(undefined, tree)

        let handler = getCollapseProcessor(alwaysExpanded)
        const result = { nodes }
        handler(result)
        const visibleNodes =
            result.nodes.filter(x => x.visible).map(x => `${x.viewLevel}:${x.nodeType}:${x.name}`)

        result.visibleNodes = visibleNodes
        return result
    }

    let tree = null
    let data = null

    // visible file with unclosed parents
    tree = {
        name: "foo",
        files: [
            "bar"
        ]
    }
    data = getTestData(tree)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:leaf:bar'])


    // invisible file with unclosed parents
    tree = {
        name: "foo",
        files: [
            {name: "bar", visible: false}
        ]
    }
    data = getTestData(tree, false)
    expect(data.visibleNodes).toEqual(['0:folder:foo'])

    // visible file with closed parent
    tree = {
        name: "foo",
        closed: true,
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, false)
    expect(data.visibleNodes).toEqual(['0:folder:foo'])

    // invisible file with closed parent
    tree = {
        name: "foo",
        closed: true,
        files: [
            {name: "bar", visible: false}
        ]
    }
    data = getTestData(tree, false)
    expect(data.visibleNodes).toEqual(['0:folder:foo'])

    // visible folder with open parents which is closed
    tree = {
        name: "foo",
        folders: [
            {
                name: "bar",
                closed: true
            }
        ]
    }
    data = getTestData(tree, false)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:folder:bar'])

    // visible folder with closed parents which is open
    tree = {
        name: "foo",
        folders: [
            {
                name: "bar",
                closed: true,
                folders: [
                    {
                        name: "foo2",
                        files: [
                            'bar2'
                        ]
                    }
                ],
                files: ['bar3']
            },
            { name: "foo3"}
        ]
    }
    data = getTestData(tree, false)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:folder:bar', '1:folder:foo3'])

    // visible file wit open parents
    tree = {
        name: "foo",
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:leaf:bar'])

    // invisible file with open parents
    tree = {
        name: "foo",
        files: [
            {visible: false, name: "bar"}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo'])

    // visible file with closed parent
    tree = {
        name: "foo",
        closed: true,
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:leaf:bar'])

    // invisible file with closed parent
    tree = {
        name: "foo",
        closed: true,
        files: [
            {name: "bar", visible: false}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo'])

    // visible folder with open parents which is closed but alwaysExpanded
    tree = {
        name: "foo",
        folders: [
            {name: "bar", closed: true, files: ['foo2']}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:folder:bar', '2:leaf:foo2'])

    // visible folder with open parents which is open and alwaysExpanded
    tree = {
        name: "foo",
        folders: [
            {name: "bar", files: ['foo2']}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:folder:bar', '2:leaf:foo2'])

    // invisible folder with open parents which is closed but alwaysExpanded
    tree = {
        name: "foo",
        folders: [
            {name: "bar", closed: true, visible: false, files: ['foo2']}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '2:leaf:foo2'])

    // invisible folder with open parents which is open and alwaysExpanded
    tree = {
        name: "foo",
        folders: [
            {name: "bar", visible: false, files: ['foo2']}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '2:leaf:foo2'])

    // visible folder with closed parents which is open and alwaysExpanded
    tree = {
        name: "foo",
        closed: true,
        folders: [
            {name: "bar", files: ['foo2']}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:folder:bar', '2:leaf:foo2'])

    // visible folder with closed parents which is closed and alwaysExpanded
    tree = {
        name: "foo",
        closed: true,
        folders: [
            {name: "bar", closed: true, files: ['foo2']}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '1:folder:bar', '2:leaf:foo2'])

    // invisible folder with closed parents which is open and alwaysExpanded
    tree = {
        name: "foo",
        closed: true,
        folders: [
            {name: "bar", visible: false, files: ['foo2']}
        ]
    }
    data = getTestData(tree, true)
    expect(data.visibleNodes).toEqual(['0:folder:foo', '2:leaf:foo2'])

    return
})

test("getMarkedProcessor", () => {
    const getTestData = (tree, selection) => {

        const nodes = getTreeTestData(undefined, tree).map(x => {x.value = x.value ?? x.name; return x})

        const result = { nodes, globals: {} }
        const collapser = getCollapseProcessor(false)
        collapser(result)
        let handler = getMarkedProcessor(selection)
        handler(result)

        const markedNiddenNodes =
            result.nodes.filter(x => !!x.markedHidden).map(x => `${x.viewLevel}:${x.nodeType}:${x.name}:${x.markedHidden}`)

        result.markedHiddenNodes = markedNiddenNodes
        return result
    }

    let tree = null
    let selected = null
    let data = null

    // visible file with unclosed parents
    tree = {
        name: "foo",
        files: [
            "bar"
        ]
    }
    selected = []
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // unselected visible file with open parents
    tree = {
        name: "foo",
        files: [
            "bar"
        ]
    }
    selected = []
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // selected visible file with open parents
    tree = {
        name: "foo",
        files: [
            "bar"
        ]
    }
    selected = ['leaf bar']
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // unselected visible file with closed parents
    tree = {
        name: "foo",
        closed: true,
        files: [
            "bar"
        ]
    }
    selected = []
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // unselected hidden file with closed parents
    tree = {
        name: "foo",
        closed: true,
        files: [
            {name: "bar", visible: false}
        ]
    }
    selected = []
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // selected hidden file with closed parent
    tree = {
        name: "foo",
        closed: true,
        files: [
            {name: "bar"}
        ]
    }
    selected = ['leaf bar']
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual(['0:folder:foo:1'])
    expect(data.globals.markedOutside).toEqual(0)

    // selected invisible file with closed parent
    tree = {
        name: "foo",
        closed: true,
        files: [
            {name: "bar", visible: false, inView: false}
        ]
    }
    selected = ['leaf bar']
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(1)

    // unselected visible folder with open parents
    tree = {
        name: "foo",
        folders: [
            {name: "bar"}
        ]
    }
    selected = []
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // unselected invisible folder with open parents
    tree = {
        name: "foo",
        folders: [
            {name: "bar", visible: false, inView: false}
        ]
    }
    selected = []
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // selected visible folder with open parents
    tree = {
        name: "foo",
        folders: [
            {name: "bar"}
        ]
    }
    selected = ['folder bar']
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // selected invisible folder with open parents
    tree = {
        name: "foo",
        folders: [
            {name: "bar", visible: false, inView: false}
        ]
    }
    selected = ['folder bar']
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(1)

    // unselected visible folder with closed parents
    tree = {
        name: "foo",
        closed: true,
        folders: [
            {name: "bar"}
        ]
    }
    selected = []
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // unselected hidden folder with closed parents
    tree = {
        name: "foo",
        closed: true,
        folders: [
            {name: "bar", visible: false, inView: false}
        ]
    }
    selected = []
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual([])
    expect(data.globals.markedOutside).toEqual(0)

    // selected visible folder with closed parents
    tree = {
        name: "foo",
        closed: true,
        folders: [
            {name: "bar"}
        ]
    }
    selected = ['folder bar']
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual(['0:folder:foo:1'])
    expect(data.globals.markedOutside).toEqual(0)

    // selected hidden folder with closed parents
    tree = {
        name: "foo",
        closed: true,
        folders: [
            {name: "bar", closed: true}
        ]
    }
    selected = ['folder bar']
    data = getTestData(tree, selected)
    expect(data.markedHiddenNodes).toEqual(['0:folder:foo:1'])
    expect(data.globals.markedOutside).toEqual(0)

    // TODO der letzte test hier schlägt fehl, wenn visible=false statt closed verwendet wird
})

const getTreeTestData = (processor, tree, filter, options = {}) => {

    const fileNames = []
    const folderNames = []

    const buildNodes = (props, isFolder = true, level = 0) => {
        if (typeof props === 'string') {
            props = {name: props}
        }
        const { name, folders = [], files = [], inView = true, visible = true, ...nodeProps } = props
        const tgt = isFolder ? folderNames : fileNames
        const index = tgt.length
        tgt.push(name)

        const node = {
            name,
            index,
            level,
            markedHidden: isFolder ? 0 : undefined,
            viewLevel: level,
            nodeType: isFolder ? 'folder' : 'leaf',
            inView,
            visible,
            ...nodeProps
        }
        const nodes = [node]
        for (const folder of folders) {
            nodes.push(
                ...buildNodes(folder, true, level + 1)
            )
        }
        if (isFolder) {
            for (const file of files) {
                nodes.push(
                    ...buildNodes(file, false, level + 1)
                )
            }
        }
        return nodes
    }

    const globals = {
        leafIndex: {
            getEntityFilterString: (index) => fileNames[index],
        },
        folderIndex: {
            getEntityFilterString: (index) => folderNames[index]
        }
    }
    const {
        isFilterRelevant = (node) => node.relevant === undefined || node.relevant !== false,
        isFilterVisible = (node) => node.fvisible = undefined || node.fvisible !== false,
        ...remOptions
    } = options

    if (!processor) return buildNodes(tree)

    const handler = processor(filter, {
        isFilterVisible,
        isFilterRelevant,
        ...remOptions,
    })
    const resultTree = {
        nodes: buildNodes(tree),
        globals
    }
    handler(resultTree)

    const visibleNodes =
        resultTree.nodes.filter(x => x.visible).map(x => `${x.viewLevel}:${x.nodeType}:${x.name}`)

    return {
        visibleNodes,
        nodes: resultTree.nodes
    }
}

test('getAncestorFilterProcessor', () => {
    const getTestData = (...args) => getTreeTestData(getAncestorFilterProcessor, ...args)

    let data = null
    let tree = {
        name: "test",
        folders: [
            {name: "foo", files: ["tex"]}
        ],
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, 'xx')
    expect(data.visibleNodes).toBeEmpty()

    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toEqual(['0:folder:test', '1:folder:foo'])

    data = getTestData(tree, 'tex')
    expect(data.visibleNodes).toEqual(['0:folder:test', '1:folder:foo', '2:leaf:tex'])

    data = getTestData(tree, 'ba')
    expect(data.visibleNodes).toEqual(['0:folder:test', '1:leaf:bar'])

    tree = {
        name: "test",
        folders: [
            {
                name: "foo",
                folders: [
                    {
                        name: "inner",
                        files: [
                            'bam'
                        ]
                    },
                    {
                        name: "inner2"
                    }
                ],
                files: [
                    "tex"
                ]
            }
        ],
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, 'ba')
    expect(data.visibleNodes).toEqual(['0:folder:test', '1:folder:foo', '2:folder:inner', '3:leaf:bam', '1:leaf:bar'])

    data = getTestData(tree, 'inner2')
    expect(data.visibleNodes).toEqual(['0:folder:test', '1:folder:foo', '2:folder:inner2'])

    // should no match irrelevant files and folders
    tree = {
        name: "test",
        folders: [
            {
                name: "foo",
                relevant: false,
                folders: [
                    {
                        name: "inner",
                        files: [
                            {name: 'bam', relevant: false}
                        ]
                    },
                    {
                        name: "in2"
                    }
                ],
                files: [
                    "tex"
                ]
            }
        ],
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, 'ba')
    expect(data.visibleNodes).toEqual(['0:folder:test', '1:leaf:bar'])

    data = getTestData(tree, 'inner')
    expect(data.visibleNodes).toEqual(['0:folder:test', '1:folder:foo', '2:folder:inner'])

    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toBeEmpty()

    //
    tree = {
        name: "test",
        folders: [
            {
                name: "foo",
                folders: [
                    {
                        name: "inner",
                        files: [
                            {name: 'bam', fvisible: false}
                        ]
                    },
                    {
                        name: "in2"
                    }
                ],
                files: [
                    "tex"
                ]
            }
        ],
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, 'bam')
    expect(data.visibleNodes).toEqual(['0:folder:test', '1:folder:foo', '2:folder:inner'])

    tree = {
        name: "test",
        folders: [
            {
                name: "foo",
                fvisible: false,
                folders: [
                    {
                        name: "inner",
                        files: [
                            {name: 'bam'}
                        ]
                    },
                    {
                        name: "in2",
                        files: [
                            'kep'
                        ]
                    }
                ],
                files: [
                    "tex"
                ]
            },
            {
                name: "boa",
                folders: [
                    {
                        name: 'ign',
                        fvisible: false,
                        folders: [
                            {name: 'mod', files: ['bing']}
                        ]
                    }
                ],
                files: [
                    'kel'
                ]
            }

        ],
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, 'bin')
    expect(data.visibleNodes).toEqual(['1:folder:mod', '2:leaf:bing'])

    data = getTestData(tree, 'ke')
    expect(data.visibleNodes).toEqual(['1:folder:in2', '2:leaf:kep', '1:folder:boa', '2:leaf:kel'])
})

test("getSubtreeFilterProcessor", () => {
    const getTestData = (...args) => getTreeTestData(getSubtreeFilterProcessor, ...args)

    let data = null

    // normal tree
    let tree = {
        name: "test",
        folders: [
            {name: "foo", files: [{name: "tex"}]}
        ],
        files: [
            {name: "bar"}
        ]
    }
    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toEqual(['1:folder:foo', '2:leaf:tex'])

    data = getTestData(tree, 'tex')
    expect(data.visibleNodes).toEqual(['1:leaf:tex'])

    data = getTestData(tree, 'b')
    expect(data.visibleNodes).toEqual(['1:leaf:bar'])

    data = getTestData(tree, 'xx')
    expect(data.visibleNodes).toEqual([])

    // tree with not filter relevant folder
    tree = {
        name: "test",
        folders: [
            {
                name: "parent",
                folders: [
                    {
                        name: "foo",
                        relevant: false,
                        files: [
                            {name: "tex"}
                        ]
                    }
                ]
            }
        ],
        files: [
            {name: "bar"}
        ]
    }
    data = getTestData(tree, 'f')
    expect(data.visibleNodes).toEqual([])

    data = getTestData(tree, 'tex')
    expect(data.visibleNodes).toEqual(['1:leaf:tex'])

    data = getTestData(tree, 'parent')
    expect(data.visibleNodes).toEqual(['1:folder:parent', '2:folder:foo', '3:leaf:tex'])

    // tree with not filter relevant file
    tree = {
        name: "test",
        folders: [
            {
                name: "parent",
                folders: [
                    {
                        name: "foo",
                        files: [
                            {name: "tex", relevant: false}
                        ]
                    }
                ]
            }
        ],
        files: [
            {name: "bar"}
        ]
    }
    data = getTestData(tree, 'tex')
    expect(data.visibleNodes).toEqual([])

    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toEqual(['1:folder:foo', '2:leaf:tex'])

    // tree with filter invisible file
    tree = {
        name: "test",
        folders: [
            {
                name: "parent",
                folders: [
                    {
                        name: "foo",
                        folders: [
                            {name: 'inner'}
                        ],
                        files: [
                            {name: 'tex', fvisible: false}
                        ]
                    }
                ]
            }
        ],
        files: [
            {name: "bar"}
        ]
    }
    data = getTestData(tree, 'tex')
    expect(data.visibleNodes).toEqual([])

    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toEqual(['1:folder:foo', '2:folder:inner'])

    // tree with filter invisible empty folder
    tree = {
        name: "test",
        folders: [
            {
                name: "parent",
                folders: [
                    {
                        name: "foo",
                        folders: [
                            {name: 'inner', fvisible: false}
                        ],
                        files: [
                            {name: "tex"}
                        ]
                    }
                ]
            }
        ],
        files: [
            {name: "bar"}
        ]
    }
    data = getTestData(tree, 'in')
    expect(data.visibleNodes).toEqual([])

    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toEqual(['1:folder:foo', '2:leaf:tex'])

    // tree with filter invisible inner folder
    tree = {
        name: "test",
        folders: [
            {
                name: "parent",
                folders: [
                    {
                        name: "foo",
                        fvisible: false,
                        folders: [
                            {name: 'inner'}
                        ],
                        files: [
                            {name: "tex"}
                        ]
                    }
                ],
                files: [
                    {name: "ips"}
                ]
            }
        ],
        files: [
            {name: "bar"}
        ]
    }
    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toEqual(['1:folder:inner', '1:leaf:tex'])

    data = getTestData(tree, 'inner')
    expect(data.visibleNodes).toEqual(['1:folder:inner'])

    data = getTestData(tree, 'tex')
    expect(data.visibleNodes).toEqual(['1:leaf:tex'])

    data = getTestData(tree, 'pa')
    expect(data.visibleNodes).toEqual(['1:folder:inner', '1:leaf:tex', '1:folder:parent', '2:leaf:ips'])

    // 2 node invisible folder path
    tree = {
        name: "test",
        folders: [
            {
                name: "parent",
                folders: [
                    {
                        name: "foo",
                        fvisible: false,
                        folders: [
                            {name: 'inner', fvisible: false, folders: [{name: 'deepest'}]}
                        ],
                        files: [
                            {name: "tex"}
                        ]
                    }
                ]
            }
        ]
    }
    data = getTestData(tree, 'dee')
    expect(data.visibleNodes).toEqual(['1:folder:deepest'])

    data = getTestData(tree, 'inn')
    expect(data.visibleNodes).toEqual(['1:folder:deepest'])

    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toEqual(['1:folder:deepest', '1:leaf:tex'])

    data = getTestData(tree, 'pa')
    expect(data.visibleNodes).toEqual(['1:folder:deepest', '1:leaf:tex', '1:folder:parent'])
})

test("getListFilterProcessor()", () => {
    const getTestData = (...args) => getTreeTestData(getListFilterProcessor, ...args)

    let data = null

    // normal tree
    let tree = {
        name: "test",
        folders: [
            {
                name: "foo",
                files: ["tex"]
            },
            {
                name: "inner",
                relevant: false,
                files: [
                    {name: 'far', relevant: false}
                ]
            },
            {
                name: 'skip',
                fvisible: false,
                files: [
                    'boo',
                    {name: 'tmp', fvisible: false}
                ]
            }
        ],
        files: [
            "bar"
        ]
    }
    data = getTestData(tree, 'xx')
    expect(data.visibleNodes).toBeEmpty()

    data = getTestData(tree, 'foo')
    expect(data.visibleNodes).toEqual(['1:folder:foo'])

    data = getTestData(tree, 'tex')
    expect(data.visibleNodes).toEqual(['1:leaf:tex'])

    data = getTestData(tree, 'ba')
    expect(data.visibleNodes).toEqual(['1:leaf:bar'])

    data = getTestData(tree, 'far')
    expect(data.visibleNodes).toBeEmpty()

    data = getTestData(tree, 'inne')
    expect(data.visibleNodes).toBeEmpty()

    data = getTestData(tree, 'sk')
    expect(data.visibleNodes).toBeEmpty()

    data = getTestData(tree, 'tmp')
    expect(data.visibleNodes).toBeEmpty()

    data = getTestData(tree, 'b')
    expect(data.visibleNodes).toEqual(['1:leaf:boo', '1:leaf:bar'])

})

test("TreeIndex->getNodes()", () => {

    const makeIndex = (tree = null) => {
        const fileModel = {}
        const folderModel = {}

        let isFirst = true
        const buildNodes = (props, isFolder = true, folder = ROOT_FOLDER_ID) => {
            if (typeof props === 'string') {
                props = {name: props}
            }

            let { name, id, folders = [], files = [], ...nodeProps } = props
            if (id === undefined) {
                id = name
            }
            let folderId = '' + id
            const tgt = isFolder ? folderModel : fileModel
            if (!(isFolder && isFirst)) {
                tgt[id] = { name, value: id, [isFolder ? 'parent' : 'folder']: folder === '0' ? undefined : folder, ...nodeProps }
            } else {
                folderId = undefined
            }
            isFirst = false
            if (folders && !Array.isArray(folders)) folders = [folders]
            for (const folder of folders) {
                buildNodes(folder, true, folderId)
            }
            if (isFolder) {
                if (files && !Array.isArray(files)) files = [files]
                for (const file of files) {
                    buildNodes(file, false, folderId)
                }
            }
        }

        if (tree !== null) {
            buildNodes(tree, true)
        }
        return new TreeIndex(
            new FolderIndex(folderModel),
            new MappingIndex(fileModel, ['name', 'folder'])
        )
    }

    const getNodes = (tree, options = {}, ...args) => {
        const index = makeIndex(tree)
        const visibleNodes = []
        const { addProp, ...remOptions } = options
        const result = index.getNodes(remOptions, ...args)
        for (const node of result.nodes) {
            const { nodeType, viewLevel, name, visible } = node
            if (!visible) continue

            const parts = [
                '' + viewLevel,
                nodeType,
                name
            ]
            if (addProp) {
                parts.push(node[addProp] ?? '')
            }
            visibleNodes.push(parts.join(':'))
        }
        return { ...result, visibleNodes }
    }

    expect(getNodes().visibleNodes).toBeEmpty()

    expect(getNodes({
        files: ['foo', 'bar']
    }).visibleNodes).toEqual(
        ['1:leaf:bar', '1:leaf:foo']
    )

    expect(getNodes({
        folders: {
            name: 'sub',
            files: 'foo'
        },
        files: 'bar'
    }).visibleNodes).toEqual(
        ['1:folder:sub', '2:leaf:foo', '1:leaf:bar']
    )

    expect(getNodes({
        folders: {
            name: 'sub',
            files: {id: 'foo', name: 'foo'}
        },
        files: {id: 'bar', name: 'bar'}
    }, {
        skip: id => id === 'leaf bar'
    }).visibleNodes).toEqual(
        ['1:folder:sub', '2:leaf:foo']
    )

    // skip handling
    //---------------------------------------

    // skip not found
    expect(getNodes({
        folders: {
            name: 'sub',
            files: {name: 'foo'}
        },
        files: 'bar'
    }, {
        skip: id => id === 'folder x'
    }).visibleNodes).toEqual(
        ['1:folder:sub', '2:leaf:foo', '1:leaf:bar']
    )

    // skip top file
    expect(getNodes({
        files: ['foo', 'bar']
    }, {
        skip: id => id === 'leaf foo'
    }).visibleNodes).toEqual(
        ['1:leaf:bar']
    )

    // skip sub file
    expect(getNodes({
        folders: [
            {
                name: 'sub',
                files: ['foo2', 'foo', 'bar2']
            }
        ],
        files: ['foo', 'bar']
    }, {
        skip: id => id === 'leaf foo'
    }).visibleNodes).toEqual(
        ['1:folder:sub', '2:leaf:foo2', '2:leaf:bar2', '1:leaf:bar']
    )

    // skip top folder should skip whole subtree
    expect(getNodes({
        folders: [
            {
                name: 'sub',
                folders: 'deep',
                files: {name: 'foo'}
            },
            {
                name: 'sub2'
            }
        ],
        files: 'bar'
    }, {
        skip: id => id === 'folder sub'
    }).visibleNodes).toEqual(
        ['1:folder:sub2', '1:leaf:bar']
    )

    // skip sub folder should skip whole subtree
    expect(getNodes({
        folders: [
            {
                name: 'sub',
                folders: {
                    name: 'deep',
                    folders: 'deeper',
                    files: 'foo2'
                },
                files: 'foo'
            },
            {
                name: 'sub2'
            }
        ],
        files: 'bar'
    }, {
        skip: id => id === 'folder deep'
    }).visibleNodes).toEqual(
        ['1:folder:sub', '2:leaf:foo', '1:folder:sub2', '1:leaf:bar']
    )

    // addPathNames
    //-----------------------------------------

    expect(getNodes({
        folders: [
            {
                name: 'sub',
                  files: 'foo'
            },
            {
                name: 'far2',
                  files: 'bar'
            }
        ],
           files: 'far'
    }, {
        filter: 'f',
        addProp: 'pathNames'
    }).visibleNodes).toEqual(
        ['1:folder:far2:', '2:leaf:bar:far2',  '1:leaf:foo:sub', '1:leaf:far:']
    )


    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'bar2'
        }],
        files: 'bar'
    }).visibleNodes).toEqual(
        ['1:folder:bar2', '1:folder:sub', '2:leaf:foo', '1:leaf:bar']
    )

    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'bar2'
        }],
        files: 'bar'
    }, {
        filter: 'x'
    }).visibleNodes).toBeEmpty()

    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'bar2'
        }],
        files: 'bar'
    }, {
        filter: 'foo'
    }).visibleNodes).toEqual(
        ['1:leaf:foo']
    )

    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'bar2'
        }],
        files: 'bar'
    }, {
        filter: 'foo',
        filterOptions: {
            result: FILTER.RESULT.WITH_ANCESTORS
        }
    }).visibleNodes).toEqual(
        ['1:folder:sub', '2:leaf:foo']
    )

    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'bar2'
        }],
        files: 'bar'
    }, {
        filter: 'foo',
        filterOptions: {
            result: FILTER.RESULT.FLAT_DIRECT
        }
    }).visibleNodes).toEqual(
        ['1:leaf:foo']
    )

    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'bar2'
        }],
        files: 'bar'
    }, {
        filter: 'foo',
        filterOptions: {
            result: FILTER.RESULT.FLAT_SUBTREES
        }
    }).visibleNodes).toEqual(
        ['1:leaf:foo']
    )

    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'more'
        }],
        files: 'bar'
    }, {
        filter: 'bar'
    }).visibleNodes).toEqual(
        ['1:leaf:bar']
    )

    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'bar2'
        }],
        files: 'bar'
    }, {
        filter: 'su'
    }).visibleNodes).toEqual(
        ['1:folder:sub', '2:leaf:foo']
    )

    expect(getNodes({
        folders: [{
            name: 'sub',
            files: 'foo'
        }, {
            name: 'bar2'
        }],
        files: 'bar'
    }, {
        filter: 'su',
        selection: ['xy']
    }).visibleNodes).toEqual(
        ['1:folder:sub', '2:leaf:foo']
    )
})

