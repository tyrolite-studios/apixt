import React, { useState } from "react"

/*
Die Komponente hat noch ein Problem
Der addEventListener muss anders gelöst werden
    => Bei einem onBlur muss er removed werden
    => Nach "Enter" o. "Escape" muss ein neuer eventlistener onclick auf den path-div gelegt werden 
    (Oder noch besser, man sollte auf ein Span drücken können und es wird zu einem input und dann mit Pfeiltasten rumspringen können)
*/

const PathInput = ({ sendPathToParent }) => {
    const handlePathInput = () => {
        const invalidChars = ["\\", ":", "*", "?", '"', "<", ">", "|"] // Liste der unerlaubten Zeichen
        addEventListener("keydown", function pathHandler(e) {
            const parent = document.getElementById("path-div")

            if (
                parent.children.length > 0 &&
                parent.lastChild.id !== "path-input"
            ) {
                const input = document.createElement("input")
                input.setAttribute("type", "text")
                input.setAttribute("id", "path-input")
                input.setAttribute("placeholder", "Enter path")
                input.setAttribute(
                    "class",
                    "ml-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                )
                parent.appendChild(input)

                input.focus()
                e.preventDefault()
                removeEventListener("keydown", pathHandler)
                return
            }

            if (invalidChars.includes(e.key)) {
                e.preventDefault()
                return
            }

            if (e.key === " " || e.key === "/") {
                const pathInput = document.getElementById("path-input")
                const inputValue = pathInput.value
                if (e.key === "/" && !inputValue.trim()) {
                    e.preventDefault()
                    return
                }
                if (!inputValue.trim()) return

                const span = document.createElement("span")
                span.setAttribute("class", "text-white text-sm")
                span.textContent = inputValue + "/"
                parent.appendChild(span)
                pathInput.remove()

                const input = document.createElement("input")
                input.setAttribute("type", "text")
                input.setAttribute("id", "path-input")
                input.setAttribute("placeholder", "Enter path")
                input.setAttribute(
                    "class",
                    "ml-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                )
                parent.appendChild(input)

                input.focus()
                e.preventDefault()
            } else if (e.key === "Backspace") {
                const pathInput = document.getElementById("path-input")
                if (!pathInput.value.trim() && parent.children.length > 1) {
                    pathInput.remove()
                    const lastSpanElement = parent.lastChild
                    const spanValue = lastSpanElement.innerText
                    lastSpanElement.remove()
                    const input = document.createElement("input")
                    input.setAttribute("type", "text")
                    input.setAttribute("id", "path-input")
                    input.setAttribute("placeholder", "Enter path")
                    input.setAttribute(
                        "class",
                        "ml-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    )
                    input.value = spanValue.replace("/", "").trim()
                    parent.appendChild(input)

                    input.focus()
                    e.preventDefault()
                }
            } else if (e.key === "Enter" || e.key === "Escape") {
                const pathInput = document.getElementById("path-input")
                const pathInputValue = pathInput.value
                if (parent.children.length > 1 || pathInputValue) {
                    pathInput.remove()
                    if (!pathInputValue.trim()) {
                        const lastSpan = parent.lastChild
                        lastSpan.innerHTML = lastSpan.innerHTML.replace("/", "")
                    } else {
                        const span = document.createElement("span")
                        span.setAttribute("class", "text-white text-sm")
                        span.innerHTML = pathInputValue
                        parent.appendChild(span)
                    }
                }
                sendPathToParent(
                    [...parent.children]
                        .reduce((val, span) => val + span.textContent, "")
                        .replace(/\s/g, "")
                )
                removeEventListener("keydown", pathHandler)
            }
        })
    }

    return (
        <div id="path-div" className="flex items-center">
            <input
                type="text"
                id="path-input"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter path"
                onFocus={handlePathInput}
            />
        </div>
    )
}

export { PathInput }
