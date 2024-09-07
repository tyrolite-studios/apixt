import "./index.css"
import controller from "core/controller"

const url = new URL(window.location.href)
url.search = ""
const baseUrl = url.toString()

let lastFetch = null

const execLastFetch = () => {
    return lastFetch().catch((e) => {
        console.error(e)
        openModal()
        document.getElementById("error-info").innerText = e.message
        document.getElementById("retry-btn").focus()
    })
}

const getFetchPromise = (getFetchPromise) => {
    lastFetch = getFetchPromise
    execLastFetch()
}

const openModal = () => {
    const elem = document.getElementById("overlay")
    elem.classList.toggle("hidden", false)
}

const closeModal = () => {
    const elem = document.getElementById("overlay")
    elem.classList.toggle("hidden", true)
}

function LoginApp(config) {
    controller.apiId = config.apiId
    controller.permanent = config.permanent
    controller.storePrefix = config.storePrefix
    controller.jwtCookieKey = config.jwtCookieKey

    const initApiExtender = (config) => {
        if (!controller.hasApp("apixt")) {
            const script = document.createElement("script")
            script.src = `${baseUrl}/index.js`
            document.head.appendChild(script)
        } else {
            controller.startApp("apixt", config)
        }
    }

    const makeDevLogin = () => {
        controller.setJwt(controller.fixJwt)
        initApiExtender({})
    }

    const autoRefresh = () => {
        const username = controller.tokenStorage.get("lastUsername")
        const usernameElem = document.getElementById("username")
        if (username) {
            usernameElem.value = username
        }
        if (usernameElem.value) {
            document.getElementById("password").focus()
        }
        const jwt = controller.getStoredJwt()
        if (controller.fixJwt) {
            if (jwt === controller.fixJwt) {
                makeDevLogin()
            } else {
                controller.clearJwt()
            }
            return
        }
        if (!jwt || controller.hasApp("apixt")) return

        getFetchPromise(() =>
            fetch(baseUrl + "/refresh", {
                headers: {
                    Authorization: `Bearer ${jwt}`
                }
            })
                .then((response) => {
                    if (response.status === 401) {
                        controller.clearJwt()
                        return
                    }
                    if (!response.ok || response.status !== 200) {
                        throw Error(
                            `Could not refresh token. Unexpected response code ${response.status} (${response.statusText})`
                        )
                    }
                    return response.json()
                })
                .then((json) => {
                    if (!json) return

                    const { jwt, config } = json
                    controller.setJwt(jwt)
                    initApiExtender(config)
                })
        )
    }

    const login = function (e) {
        e.preventDefault()
        const formData = new FormData(document.getElementById("login-form"))
        const searchParams = new URLSearchParams(formData)
        const currUsername = formData.get("username")
        if (currUsername) {
            controller.tokenStorage.set("lastUsername", currUsername)
        }
        if (controller.fixJwt) {
            makeDevLogin()
            return
        }
        getFetchPromise(() => {
            return fetch(baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: searchParams
            })
                .then((response) => {
                    if (response.status === 401) {
                        const classList =
                            document.getElementById("login-form").classList
                        classList.toggle("shake-anim", true)
                        const inputs = document.getElementsByTagName("input")
                        for (const input of inputs) {
                            input.setAttribute("maxlength", "0")
                        }
                        setTimeout(() => {
                            classList.remove("shake-anim")
                            for (const input of inputs) {
                                input.removeAttribute("maxlength")
                            }
                            document.getElementById("password").focus()
                        }, 500)
                        return
                    }
                    if (!response.ok) {
                        throw Error(
                            `Could not login. Unexpected response code ${response.status} (${response.statusText})`
                        )
                    }
                    return response.json()
                })
                .then((json) => {
                    if (!json) return

                    const { config, jwt } = json
                    controller.setJwt(jwt)
                    initApiExtender(config)
                })
        })
    }

    document.body.innerHTML =
        '<div class="full bg-app-bg text-app-text">' +
        '<div id="overlay" class="hidden full bg-overlay-bg/50 absolute">' +
        '<div class="grid place-items-center h-full w-full">' +
        '<div class="text-center bg-warning-bg text-warning-text w-full py-3">' +
        '<div class="stack-v gap-3">' +
        '<div class="text-warning-text/50">' +
        "An error occured:" +
        "</div>" +
        '<div id="error-info"></div>' +
        '<div class="stack-h gap-2 place-content-center">' +
        '<button id="retry-btn" class="bg-button-bg text-button-text border-button-border border px-2">Retry</button>' +
        '<button id="cancel-btn" class="bg-button-bg text-button-text border-button-border border px-2">Cancel</button></div>' +
        "</div>" +
        "</div >" +
        "</div>" +
        "</div>" +
        '<div class="grid place-content-center h-full">' +
        '<form id="login-form" class="text-center">' +
        '<div id="login-div" class="stack-v gap-2 border-header-border border shadow-md">' +
        '<div class="bg-header-bg text-header-text px-2">' +
        "Login" +
        "</div>" +
        '<div class="grid gap-1 py-1 grid-cols-[min-content_auto] p-3">' +
        '<div class="text-xs">Username:</div>' +
        '<input id="username" name="username" type="text" autocomplete="username" required class="invalid:bg-warning-bg invalid:text-warning-text px-2 bg-input-bg text-input-text border-input-border" />' +
        '<div class="text-xs">Password:</div>' +
        '<input id="password" type="password" name="password" autocomplete="current-password" required class="invalid:bg-warning-bg invalid:text-warning-text px-2 bg-input-bg text-input-text border-input-border" />' +
        "</div>" +
        '<div class="pb-2">' +
        '<button type="submit" class="bg-button-bg text-button-text border border-button-border text-xs px-2">' +
        "Submit" +
        "</button>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</form>" +
        "</div>" +
        "</div>"

    document.getElementById("login-form").addEventListener("submit", login)
    document.getElementById("retry-btn").addEventListener("click", () => {
        closeModal()
        execLastFetch()
    })
    document.getElementById("cancel-btn").addEventListener("click", closeModal)

    requestAnimationFrame(() => autoRefresh())
}

controller.registerApp("login", LoginApp)
