import { useState, useEffect } from "react"
import { Input } from "./form"
import { BrowserStorage } from "core/storage"
import { d } from "core/helper"

const url = new URL(window.location.href)
url.search = ""
const baseUrl = url.toString()

let storage = null

function LoginApp({ config }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")

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

    useEffect(() => {
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
    }, [])

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

    return (
        <div className="full bg-app-bg text-app-text">
            <div className="grid place-content-center h-full">
                <form id="login-form" className="text-center" onSubmit={login}>
                    <div className="stack-v gap-2 border-header-border border shadow-md">
                        <div className="bg-header-bg text-header-text px-2">
                            Login
                        </div>

                        <div className="stack-v gap-2 px-3">
                            <div className="stack-h gap-2">
                                <div className="text-xs">Username:</div>
                                <Input
                                    id="username"
                                    name="username"
                                    value={username}
                                    set={setUsername}
                                    type="text"
                                />
                            </div>

                            <div className="stack-h gap-2">
                                <div className="text-xs">Password:</div>
                                <Input
                                    type="password"
                                    name="password"
                                    value={password}
                                    set={setPassword}
                                />
                            </div>

                            <div className="pb-2">
                                <button className="bg-button-bg text-button-text border border-button-border text-xs px-2">
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export { LoginApp }
