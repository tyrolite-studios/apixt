import { BrowserStorage } from "core/storage"

const url = new URL(window.location.href)
url.search = ""
const baseUrl = url.toString()

let storage = null

function LoginApp({ config }) {
    if (storage === null) {
        storage = BrowserStorage(localStorage, "tls.apixt.")
    }

    const initApiExtender = (config) => {
        if (!window.runApiExtender) {
            const script = document.createElement("script")
            script.src = `${baseUrl}/index.js`
            document.head.appendChild(script)
        } else {
            window.runApiExtender(config)
        }
    }

    const clearJwt = () => {
        storage.deleteJson("jwt")
        document.cookie = "tls.apixt.jwt=; Max-Age=-9999; path=/"
    }

    const setJwt = (jwt) => {
        storage.setJson("jwt", jwt)
        document.cookie = `tls.apixt.jwt=${jwt}; path=/`
    }

    const checkDevLogin = () => {
        if (!window.loginResponse) return false

        const { jwt, config } = window.loginResponse
        setJwt(jwt)
        initApiExtender(config)
        return true
    }

    const autoRefresh = () => {
        window.clearJwt = clearJwt

        const jwt = storage.getJson("jwt")
        if (
            window.loginResponse &&
            jwt === window.loginResponse.jwt &&
            checkDevLogin()
        )
            return

        if (window.runApiExtender || !jwt) return

        fetch(baseUrl + "/refresh", {
            headers: {
                Authorization: `Bearer ${jwt}`
            }
        })
            .then((response) => {
                if (!response.ok || response.status !== 200) {
                    throw Error(`Could not authenticate`)
                }
                return response.json()
            })
            .then(({ jwt, config }) => {
                setJwt(jwt)
                initApiExtender(config)
            })
            .catch(clearJwt)
    }

    const login = function (e) {
        if (checkDevLogin()) return

        const formData = new FormData(document.getElementById("login-form"))
        const searchParams = new URLSearchParams(formData)
        e.preventDefault()

        fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: searchParams
        })
            .then((response) => {
                if (response.status === 401) {
                    document.getElementById("username").focus()
                    throw Error(`Could not authenticate`)
                }
                return response.json()
            })
            .then(({ config, jwt }) => {
                setJwt(jwt)
                initApiExtender(config)
            })
            .catch(clearJwt)
    }

    document.body.innerHTML =
        '<div class="full bg-app-bg text-app-text">' +
        '<div class="grid place-content-center h-full">' +
        '<form id="login-form" class="text-center" onSubmit={login}>' +
        '<div class="stack-v gap-2 border-header-border border shadow-md">' +
        '<div class="bg-header-bg text-header-text px-2">' +
        "Login" +
        "</div>" +
        '<div class="stack-v gap-2 px-3">' +
        '<div class="stack-h gap-2">' +
        '<div class="text-xs">Username:</div>' +
        '<input id="username" name="username" type="text" />' +
        "</div>" +
        '<div class="stack-h gap-2">' +
        '<div class="text-xs">Password:</div>' +
        '<input type="password" name="password" />' +
        "</div>" +
        '<div class="pb-2">' +
        '<button class="bg-button-bg text-button-text border border-button-border text-xs px-2">' +
        "Submit" +
        "</button>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</form>" +
        "</div>" +
        "</div>"

    document.getElementById("login-form").addEventListener("submit", login)
    autoRefresh()
}

export { LoginApp }
