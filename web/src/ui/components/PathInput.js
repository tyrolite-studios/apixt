import React, { useState, useRef, act } from "react"

/*
Die Komponente hat noch unschöne Lösungen
Der addEventListener muss anders gelöst werden
    => Bei einem onBlur muss er removed werden
Ich benutze path-input als fixe id beim erstellen vom Input feld, Das vllt mit ref lösen?
*/

const getIndexOfChild = (child, children) => {
    for (let i = 0; i < children.length; i++) {
        if (children[i] === child) return i
    }
}

const replaceElementInCollection = (newElement, oldElement, collection) => {
    collection.insertBefore(newElement, oldElement)
    oldElement.remove()

    return collection
}

const createSpan = (content = "", cls = "text-white text-sm") => {
    const span = document.createElement("span")
    span.setAttribute("class", cls)
    span.textContent = content

    return span
}
const createInput = (
    value = "",
    id = "path-input",
    type = "text",
    placeholder = "Enter path",
    cls = "ml-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
) => {
    const input = document.createElement("input")
    input.setAttribute("type", type)
    input.setAttribute("id", id)
    input.setAttribute("placeholder", placeholder)
    input.setAttribute("class", cls)
    input.value = value

    return input
}

const PathInput = ({ sendPathToParent }) => {
    const pathParentRef = useRef(null)

    const handlePathInput = () => {
        const invalidChars = ["\\", ":", "*", "?", '"', "<", ">", "|"] // Liste der unerlaubten Zeichen
        addEventListener("keydown", function pathHandler(e) {
            const parent = pathParentRef.current
            const children = pathParentRef.current.children

            if (invalidChars.includes(e.key)) {
                e.preventDefault()
                return
            }

            if (e.key === "ArrowLeft") {
                const index = getIndexOfChild(e.target, children)
                if (index !== 0 && e.target.selectionStart === 0) {
                    e.preventDefault()
                    //Das jetzige Element ersetzen mit dem Span
                    const span = createSpan("/" + children[index].value)
                    pathParentRef.current = replaceElementInCollection(
                        span,
                        children[index],
                        parent
                    )
                    //Das vorherige Element ersetzen mit dem Input
                    const input = createInput(
                        children[index - 1].textContent.replace(/\//g, "")
                    )
                    pathParentRef.current = replaceElementInCollection(
                        input,
                        children[index - 1],
                        parent
                    )
                    input.focus()
                }
            } else if (e.key === "ArrowRight") {
                const index = getIndexOfChild(e.target, children)
                if (
                    children.length !== index + 1 &&
                    e.target.selectionEnd === e.target.value.length
                ) {
                    e.preventDefault()
                    //Das jetzige Element ersetzen mit dem Span
                    const span = createSpan(children[index].value + "/")
                    pathParentRef.current = replaceElementInCollection(
                        span,
                        children[index],
                        parent
                    )
                    //Das nächste Element ersetzen mit dem Input
                    const input = createInput(
                        children[index + 1].textContent.replace(/\//g, "")
                    )
                    pathParentRef.current = replaceElementInCollection(
                        input,
                        children[index + 1],
                        parent
                    )
                    input.selectionEnd = 0
                    input.focus()
                }
            } else if (e.key === " " || e.key === "/") {
                const pathInput = document.getElementById("path-input")
                const inputValue = pathInput.value

                if (e.key === "/" && !inputValue.trim()) {
                    e.preventDefault()
                    return
                }
                if (!inputValue.trim()) return

                const [spanVal, inputVal] =
                    pathInput.selectionEnd !== inputValue.length
                        ? [
                              inputValue.slice(0, pathInput.selectionEnd),
                              inputValue.slice(
                                  pathInput.selectionEnd,
                                  inputValue.length
                              )
                          ]
                        : [inputValue, ""]

                const span = createSpan(spanVal + "/")
                const index = getIndexOfChild(pathInput, children)
                pathParentRef.current = replaceElementInCollection(
                    span,
                    pathInput,
                    parent
                )
                const input = createInput(inputVal)
                if (index + 1 === children.length) {
                    pathParentRef.current.appendChild(input)
                } else {
                    pathParentRef.current.insertBefore(
                        input,
                        children[index + 1]
                    )
                }
                input.focus()
                e.preventDefault()
            } else if (e.key === "Backspace") {
                const pathInput = document.getElementById("path-input")
                const index = getIndexOfChild(pathInput, children)
                if (!pathInput.value.trim() && parent.children.length > 1) {
                    const elementToJumpTo =
                        index !== 0 ? children[index - 1] : children[index + 1]
                    pathInput.remove()
                    const input = createInput(
                        elementToJumpTo.textContent.replace(/\//g, "").trim()
                    )
                    pathParentRef.current = replaceElementInCollection(
                        input,
                        elementToJumpTo,
                        parent
                    )
                    input.focus()
                    e.preventDefault()
                }
            } else if (e.key === "Enter" || e.key === "Escape") {
                const pathInput = document.getElementById("path-input")
                const index = getIndexOfChild(pathInput, children)
                if (!pathInput.value.trim()) {
                    const lastChildValue = children[index - 1].textContent
                    pathInput.remove()
                    if (lastChildValue.endsWith("/"))
                        children[index - 1].textContent =
                            lastChildValue.substring(
                                0,
                                lastChildValue.length - 1
                            )
                } else {
                    const span = createSpan(pathInput.value)
                    pathParentRef.current = replaceElementInCollection(
                        span,
                        children[index],
                        pathParentRef.current
                    )
                }
                sendPathToParent(
                    [...parent.children]
                        .filter((child) => child.textContent.trim())
                        .map((child) => child.textContent.replace(/\//g, ""))
                        .join("/")
                )
                addEventListener("click", function clickHandler(e) {
                    if (e.target.parentElement === pathParentRef.current) {
                        const index = getIndexOfChild(e.target, children)

                        const input = createInput(
                            children[index].textContent
                                .replace(/\//g, "")
                                .trim()
                        )
                        if (children[index].textContent.startsWith("/")) {
                            children[index - 1].textContent += "/"
                        }
                        pathParentRef.current = replaceElementInCollection(
                            input,
                            children[index],
                            pathParentRef.current
                        )
                        //Wenn es ein Feld danach gibt fügt er den "/" im nächsten Element zu
                        const nextElement = children[index + 1]
                        if (
                            nextElement &&
                            !nextElement.textContent.startsWith("/")
                        )
                            nextElement.textContent =
                                "/" + nextElement.textContent
                        children[index].focus()
                        removeEventListener("click", clickHandler)
                        handlePathInput()
                    }
                })
                removeEventListener("keydown", pathHandler)
            }
        })
    }

    return (
        <div ref={pathParentRef} className="flex items-center">
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
