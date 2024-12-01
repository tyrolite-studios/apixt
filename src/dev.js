import "plugins/fake-requests/plugin"
import controller from "core/controller"
import devConfig from "./dev/config.js"

const { jwt, config } = devConfig
controller.fixJwt = jwt

controller.setAppOverwrites("apixt", config)
controller.startApp("login", {
    apiId: config.apiId,
    permanent: config.permanent,
    storePrefix: config.storePrefix
})
