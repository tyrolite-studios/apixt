import { EntityIndex, MappingIndex } from "../../src/core/entity"
import { d } from "../../src/core/helper"

class ArrayIndex extends EntityIndex {
    constructor(items) {
        super()
        this.items = items
    }
}

test("EntityIndex of array-values", () => {
    let index = new ArrayIndex(["foo", "bar", "foobar"])

    expect(index.length).toEqual(3)

    expect(index.hasIndex(0)).toBeTrue()
    expect(index.hasIndex(2)).toBeTrue()
    expect(index.hasIndex(-1)).toBeFalse()
    expect(index.hasIndex(3)).toBeFalse()

    expect(index.getEntityProps()).toEqual(["index", "value"])
    expect(index.allIndices).toEqual([0, 1, 2])

    expect(index.getEntityPropValue(0, "index")).toEqual(0)
    expect(index.getEntityPropValue(0, "value")).toEqual("foo")

    expect(index.getEntityObject(1)).toEqual({ index: 1, value: "bar" })
    expect(index.getEntityValue(2)).toEqual("foobar")

    expect(index.getEntityByPropValue("value", "foobar")).toEqual(2)
    expect(index.getPropValues("index")).toEqual([0, 1, 2])
    expect(index.getPropValues("value")).toEqual(["foo", "bar", "foobar"])

    expect(index.getEntityObjects()).toEqual([
        { index: 0, value: "foo" },
        { index: 1, value: "bar" },
        { index: 2, value: "foobar" }
    ])

    let view = index.getView()
    expect(view.count).toEqual(3)
    expect(view.matches).toEqual([0, 1, 2])
    expect(view.pages).toEqual(1)

    view = index.getView({ start: 1 })
    expect(view.count).toEqual(3)
    expect(view.matches).toEqual([1, 2])
    expect(view.pages).toEqual(1)

    view = index.getView({ start: 3 })
    expect(view.count).toEqual(3)
    expect(view.matches).toEqual([])
    expect(view.pages).toEqual(1)

    view = index.getView({ start: 1, length: 1 })
    expect(view.count).toEqual(3)
    expect(view.matches).toEqual([1])
    expect(view.pages).toEqual(3)

    view = index.getView({
        match: (idx) => index.getEntityValue(idx).startsWith("f")
    })
    expect(view.count).toEqual(2)
    expect(view.matches).toEqual([0, 2])
    expect(view.pages).toEqual(1)

    view = index.getView({
        match: (idx) => false
    })
    expect(view.count).toEqual(0)
    expect(view.matches).toEqual([])
    expect(view.pages).toEqual(1)

    view = index.getView({
        sort: (ia, ib) => {
            const a = index.getEntityValue(ia)
            const b = index.getEntityValue(ib)
            return a === b ? 0 : a > b ? 1 : -1
        }
    })
    expect(view.count).toEqual(3)
    expect(view.matches).toEqual([1, 0, 2])
    expect(view.pages).toEqual(1)

    view = index.getView({ page: 2, length: 2 })
    expect(view.count).toEqual(3)
    expect(view.matches).toEqual([2])
    expect(view.pages).toEqual(2)

    view = index.getView({ page: 3, length: 2 })
    expect(view.count).toEqual(3)
    expect(view.matches).toEqual([])
    expect(view.pages).toEqual(2)

    index.setEntityValue(1, "barbar")
    expect(index.getEntityValue(1)).toEqual("barbar")

    // append entity
    index.setEntityObject({ value: "new bar" })
    expect(index.length).toEqual(4)
    expect(index.getEntityObject(3)).toEqual({ index: 3, value: "new bar" })

    // insert at beginning
    index.setEntityObject({ index: 0, value: "new start" })
    expect(index.length).toEqual(5)
    expect(index.getEntityObject(0)).toEqual({ index: 0, value: "new start" })

    // overwrite
    index.setEntityObject({ index: 2, value: "bar" }, true)
    expect(index.length).toEqual(5)
    expect(index.getEntityObject(2)).toEqual({
        index: 2,
        value: "bar"
    })

    index.deleteEntity(2)
    expect(index.length).toEqual(4)
    expect(index.allIndices).toEqual([0, 1, 2, 3])
    expect(index.getEntityValue("bar")).toBeUndefined()

    index.setItems(["foo"])
    expect(index.length).toEqual(1)
    expect(index.allIndices).toEqual([0])
})

class SortedArrayIndex extends EntityIndex {
    constructor(items, sort = (a, b) => (a === b ? 0 : a > b ? 1 : -1)) {
        super()
        this.items = items.sort(sort)
        this.indexSorting = sort
    }
}

test("EntityIndex of sorted array-values", () => {
    let index = new SortedArrayIndex(["foo", "bar", "foobar"])

    expect(index.length).toEqual(3)
    expect(index.allIndices).toEqual([0, 1, 2])

    expect(index.getEntityValue(0)).toEqual("bar")

    // "append"
    index.setEntityObject({ value: "aaa" })
    expect(index.getEntityByPropValue("value", "aaa")).toEqual(0)

    // overwrite
    index.setEntityObject({ index: 0, value: "zzz" }, true)
    expect(index.getEntityByPropValue("value", "zzz")).toEqual(3)

    expect(index.getEntityByPropValue("value", "bar")).toEqual(0)
})

test("MappingIndex", () => {
    let index = new MappingIndex(
        {
            foo: {
                name: "Foo",
                url: "http://hghwegwe"
            },
            bar: {
                name: "Bar",
                url: "http://sdse42"
            },
            barFoo: {
                name: "BarFoo",
                url: "http://www.wewerwe"
            }
        },
        ["name", "url"]
    )

    expect(index.length).toEqual(3)
    expect(index.allIndices).toEqual([0, 1, 2])

    expect(index.getEntityObject(1)).toEqual({
        index: 1,
        value: "bar",
        name: "Bar",
        url: "http://sdse42"
    })

    index.setEntityPropValue(1, "value", "bars")
    expect(index.getEntityValue(1)).toEqual("bars")
    expect(Object.keys(index.model).includes("bar")).toBeFalse()
    expect(Object.keys(index.model).includes("bars")).toBeTrue()

    // append
    index.setEntityObject({ value: "baba", name: "Baba", url: "empty" })
    expect(index.length).toEqual(4)
    expect(index.getEntityObject(3)).toEqual({
        index: 3,
        value: "baba",
        name: "Baba",
        url: "empty"
    })

    // insert
    index.setEntityObject({
        index: 1,
        value: "barbar",
        name: "Barbar",
        url: "empty"
    })
    expect(index.length).toEqual(5)
    expect(index.getEntityObject(1)).toEqual({
        index: 1,
        value: "barbar",
        name: "Barbar",
        url: "empty"
    })
})
