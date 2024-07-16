import { useContext, useState } from "react"
import { AppContext } from "./context"

function Button({ name, onClick, className }) {
    const aContext = useContext(AppContext)
    const [clicked, setClicked] = useState(false)

    const state = clicked ? "active" : "button"

    const cls = ["text-xs border py-1 px-3 hover:bg-button-hover-bg"]
    if (clicked) {
        cls.push("bg-active-bg text-active border-active-border")
    } else {
        cls.push("bg-button-bg text-button border-button-border")
    }

    if (className) cls.push(className)

    return (
        <button
            className={cls.join(" ")}
            onMouseDown={(e) => {
                aContext.startExclusiveMode("clicked", "pointer")
                aContext.addEventListener(
                    "mouseup",
                    (e) => {
                        aContext.endExclusiveMode("clicked")
                        setClicked(false)
                        onClick()
                    },
                    { once: true }
                )
                e.stopPropagation()
                e.preventDefault()
                setClicked(true)
            }}
        >
            {name}
        </button>
    )
}

export { Button }
