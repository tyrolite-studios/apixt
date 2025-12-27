import { isNull, AxisHandler, OVERFLOW } from "../../src/core/helper.js"

test("isNull()", () => {
    expect(isNull(null)).toBeTrue()
})

test("AxisHandler", () => {
    const getNewHandler = ({ viewCount = 5, focusIndex = 0, overflow, refOffset = {}, viewToFocusIndex, pageIndexEnd } = {}) => {
        const setFocusIndex = newValue => ref.focusIndex = newValue

        const ref = {
            setFocusIndex,
            focusIndex,
            viewCount,
            overflow,
            viewToFocusIndex,
            ...refOffset
        }
        return {
            ref,
            axis: AxisHandler(
            () => ({ ...ref, ...refOffset })
        )}
    }

    // move-by overflow strategies

    {
        const res = getNewHandler({ viewCount: 6 })

        expect(res.ref.focusIndex).toEqual(0)
        res.axis.moveBy(-1)
        expect(res.ref.focusIndex).toEqual(0)
        res.axis.moveBy(1)
        expect(res.ref.focusIndex).toEqual(1)
        res.axis.moveBy(2)
        expect(res.ref.focusIndex).toEqual(3)
        res.axis.moveBy(3)
        expect(res.ref.focusIndex).toEqual(5)
    }

    {
        const res = getNewHandler({ viewCount: 6, overflow: OVERFLOW.WRAP })

        expect(res.ref.focusIndex).toEqual(0)
        res.axis.moveBy(-3)
        expect(res.ref.focusIndex).toEqual(5)
        res.axis.moveBy(3)
        expect(res.ref.focusIndex).toEqual(0)
        res.axis.moveBy(-1)
        expect(res.ref.focusIndex).toEqual(5)
        res.axis.moveBy(-1)
        expect(res.ref.focusIndex).toEqual(4)
    }

    {
        const res = getNewHandler({ viewCount: 6, overflow: OVERFLOW.MODULO })

        expect(res.ref.focusIndex).toEqual(0)
        res.axis.moveBy(-3)
        expect(res.ref.focusIndex).toEqual(3)
        res.axis.moveBy(4)
        expect(res.ref.focusIndex).toEqual(1)
        res.axis.moveBy(-1)
        expect(res.ref.focusIndex).toEqual(0)
    }

    // pagination-viewToFocusIndex

    {
        const itemsPerPage = 10

        const refOffset = {pageIndexStart: 0, pageIndexEnd: itemsPerPage - 1}

        const viewToFocusIndex = newValue => {
            const newPage = Math.floor(newValue / itemsPerPage)
            refOffset.pageIndexStart = newPage * itemsPerPage
            refOffset.pageIndexEnd = refOffset.pageIndexStart + itemsPerPage - 1

            return newValue % itemsPerPage

        }
        const res = getNewHandler({ viewCount: 30, pageIndexEnd: 9, viewToFocusIndex, refOffset })
        res.axis.moveBy(9)
        expect(res.ref.focusIndex).toEqual(9)
        expect(refOffset.pageIndexStart).toEqual(0)
        res.axis.moveBy(1)
        expect(res.ref.focusIndex).toEqual(0)
        expect(refOffset.pageIndexStart).toEqual(10)
        res.axis.moveBy(12)
        expect(res.ref.focusIndex).toEqual(2)
        expect(refOffset.pageIndexStart).toEqual(20)
        res.axis.moveBy(10)
        expect(res.ref.focusIndex).toEqual(9)
        expect(refOffset.pageIndexStart).toEqual(20)

    }

    // infinite-viewToFocusIndex
    {
        const loadItems = 10
        const viewCount = 30
        const refOffset = {pageIndexEnd: 15}

        const viewToFocusIndex = viewIndex => {
            while(viewIndex > refOffset.pageIndexEnd) {
                refOffset.pageIndexEnd += loadItems
            }
            refOffset.pageIndexEnd = Math.min(viewCount - 1, refOffset.pageIndexEnd)
            return viewIndex
        }
        const res = getNewHandler({
            focusIndex: 10, viewCount, viewToFocusIndex, refOffset
        })
        res.axis.moveBy(9)
        expect(res.ref.focusIndex).toEqual(19)
        expect(refOffset.pageIndexEnd).toEqual(25)
        res.axis.moveBy(9)
        expect(res.ref.focusIndex).toEqual(28)
        expect(refOffset.pageIndexEnd).toEqual(29)
    }


})
