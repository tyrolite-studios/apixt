import { isNull } from "../../src/core/helper.js"

test("isNull()", () => {
    expect(isNull(null)).toBeTrue()
})
