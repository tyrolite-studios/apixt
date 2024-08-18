import "plugins/fakeRequests/plugin"

if (!window.loginResponse) {
    window.loginResponse = {
        jwt: "developerJwt",
        config: { username: "developer" }
    }
}
