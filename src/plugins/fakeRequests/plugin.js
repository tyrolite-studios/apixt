import { AbstractPlugin, PluginRegistry } from "core/plugin"
import { CMD } from "core/tree"
import { d } from "core/helper"

const responseStream = [
    { cmd: CMD.OPEN_SECTION, name: "Application" },
    {
        cmd: CMD.ADD_DUMP,
        name: "Test special dump",
        vars: [{ name: "int", value: "666" }]
    },
    { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
    { cmd: CMD.OPEN_SECTION_DETAILS },
    {
        cmd: CMD.ADD_CODE_BLOCK,
        name: "Http Header",
        html: "<pre>Content-Type: application/json</pre>"
    },
    { cmd: CMD.CLOSE_SECTION_DETAILS },
    {
        cmd: CMD.ADD_CODE_BLOCK,
        name: "Http Request",
        html: JSON.stringify({
            foo: "bar",
            "fooo-3": { number: 666, hack: true }
        }),
        mime: "text/json",
        footer: {
            "Content-Type": "application/json",
            "Content-Length": "166"
        }
    },
    { cmd: CMD.CLOSE_SECTION },
    { cmd: CMD.CLOSE_SECTION },
    { cmd: CMD.OPEN_SECTION, name: "Application" },
    {
        cmd: CMD.ADD_DUMP,
        name: "Test even more special dump",
        vars: [
            { name: "string", value: '"hey man!"' },
            {
                name: "object",
                value: {
                    boom: { name: "bool", value: "true" },
                    "hey ho": {
                        name: "array",
                        value: [{ name: "int", value: "208" }]
                    }
                }
            }
        ]
    },
    { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
    { cmd: CMD.OPEN_SECTION_DETAILS },
    {
        cmd: CMD.ADD_CODE_BLOCK,
        name: "Http Header",
        html: "<pre>Content-Type: application/json</pre>"
    },
    { cmd: CMD.CLOSE_SECTION_DETAILS },
    {
        cmd: CMD.ADD_CODE_BLOCK,
        name: "Http Response",
        html: JSON.stringify({
            foo: "bar",
            "fooo-3": { number: 666, hack: true }
        }),
        mime: "text/json"
    },
    { cmd: CMD.CLOSE_SECTION },
    { cmd: CMD.CLOSE_SECTION },
    { cmd: CMD.END }
]

const errorResponse = [
    {
        cmd: CMD.ADD_DUMP,
        name: "Booting error...",
        vars: [{ name: "int", value: "666" }]
    },
    { cmd: CMD.OPEN_SECTION, name: "Application" },
    {
        cmd: CMD.ADD_DUMP,
        name: "Test special dump",
        vars: [{ name: "int", value: "666" }]
    },
    { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
    {
        cmd: CMD.ADD_CODE_BLOCK,
        name: "Http Header",
        html: "<pre>Content-Type: application/json</pre>"
    },
    { cmd: CMD.CLOSE_SECTION_DETAILS },
    {
        cmd: CMD.ADD_CODE_BLOCK,
        name: "Http Request",
        html: JSON.stringify({
            foo: "bar",
            "fooo-3": { number: 666, hack: true }
        }),
        mime: "text/json",
        footer: { "Content-Type": "application/json" }
    },
    { cmd: CMD.CLOSE_SECTION },
    { cmd: CMD.CLOSE_SECTION },
    { cmd: CMD.OPEN_SECTION, name: "Application" },
    {
        cmd: CMD.ADD_DUMP,
        name: "Test special dump",
        vars: [{ name: "int", value: "666" }]
    },
    { cmd: CMD.OPEN_SECTION, name: "HttpRequest" },
    { cmd: CMD.OPEN_SECTION_DETAILS },
    {
        cmd: CMD.ADD_CODE_BLOCK,
        name: "Http Header",
        html: "<pre>Content-Type: application/json</pre>"
    },
    { cmd: CMD.CLOSE_SECTION_DETAILS },
    {
        cmd: CMD.ADD_CODE_BLOCK,
        name: "Http Request",
        mime: "text/json",
        html: JSON.stringify({
            foo: "bar",
            "fooo-3": { number: 666, hack: true }
        })
    },
    { cmd: CMD.CLOSE_SECTION },
    { cmd: CMD.CLOSE_SECTION },
    { cmd: CMD.END }
]

class Plugin extends AbstractPlugin {
    get id() {
        return "fakeRequests"
    }

    get name() {
        return "Fake Requests"
    }

    get description() {
        return "Adds buttons for faking API responses"
    }

    get defaultActive() {
        return true
    }

    init() {
        this.addHeaderButton({ id: "load", name: "Fake load..." })
        this.addHeaderButton({ id: "error", name: "Fake error..." })
        this.setButtonHandler("load", ({ ctx }) => {
            ctx.startContentStream({
                responseStream: {
                    lines: responseStream,
                    speed: 200,
                    status: 200
                },
                response: {
                    status: 200,
                    body: {
                        foo: "bar",
                        woo: "boo",
                        "fooo-3": { number: 766 }
                    }
                }
            })
        })
        this.setButtonHandler("error", ({ ctx }) => {
            ctx.startContentStream({
                responseStream: {
                    lines: errorResponse,
                    speed: 200
                }
            })
        })
    }
}

PluginRegistry.add(new Plugin())
