import { BrowserStorage, TempStorage } from "core/storage"

const apps = {}
let storages = null
let running = null
let fixJwt = null
let apiId = null
let cookieKey = null
let permanent = true
let storePrefix = null

const controller = {
    getStorages: () => {
        if (!storages) {
            if (storePrefix === null) throw Error(`No store prefix was set`)

            const apiPrefix = `${storePrefix}${apiId}.`
            storages = {
                global: BrowserStorage(localStorage, `${storePrefix}global.`),
                api: BrowserStorage(localStorage, apiPrefix),
                session: BrowserStorage(sessionStorage, apiPrefix),
                temp: TempStorage()
            }
        }
        return storages
    },
    setStorages: (newStorages) => {
        storages = newStorages
    },
    clearJwtCookie() {
        document.cookie = `${cookieKey}=; Max-Age=-9999; path=/`
    },
    clearJwt() {
        controller.tokenStorage.delete("jwt")
        controller.clearJwtCookie()
    },
    setJwt(jwt) {
        controller.tokenStorage.set("jwt", jwt)
        document.cookie = `${cookieKey}=${jwt}; path=/`
    },
    getStoredJwt() {
        return controller.tokenStorage.get("jwt")
    },
    set apiId(value) {
        apiId = value
    },
    set permanent(value) {
        permanent = value
    },
    set storePrefix(value) {
        storePrefix = value
    },
    set jwtCookieKey(value) {
        cookieKey = value
    },
    get fixJwt() {
        return fixJwt
    },
    set fixJwt(value) {
        fixJwt = value
    },
    get globalStorage() {
        return controller.getStorages().global
    },
    get apiStorage() {
        return controller.getStorages().api
    },
    get sessionStorage() {
        return controller.getStorages().session
    },
    get tempStorage() {
        return controller.getStorages().temp
    },
    get tokenStorage() {
        return controller[permanent ? "apiStorage" : "sessionStorage"]
    },
    registerApp: (id, create, destroy) => {
        apps[id] = { create, destroy }
    },
    setAppOverwrites: (id, overwrites) => {
        controller.hasApp(id, true)
        apps[id].overwrites = overwrites
    },
    hasApp: (id, strict = false) => {
        const has = !!apps[id]
        if (strict && !has) {
            throw Error(`App with id "${id}" was not registered`)
        }
        return has
    },
    startApp: (id, config = {}) => {
        const app = apps[id]
        if (!app) {
            throw Error(`Invalid app id "${id}" given!`)
        }
        if (!app.config) {
            app.config = config
        } else {
            config = app.config
        }
        const { create, overwrites = {} } = app

        const callCreateApp = () => {
            requestAnimationFrame(() => {
                running = id
                const createApp = () => {
                    create({ ...config, ...overwrites })
                }
                if (document.readyState === "loading") {
                    addEventListener("DOMContentLoaded", createApp, {
                        once: true
                    })
                } else {
                    createApp()
                }
            })
        }

        if (running) {
            const { destroy } = apps[running]
            if (destroy) {
                destroy()
            }
            requestAnimationFrame(() => callCreateApp())
        } else {
            callCreateApp()
        }
    }
}
window.controller = controller

export default controller
