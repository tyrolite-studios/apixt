# Frontend Plugin Development

## Overview

A frontend plugin is an extension of the API extender that can be enabled or disabled by the user in the settings and can
- add buttons to the header
- add buttons to code blocks (depending on certain conditions)
- add a widget to the dashboard
- register hooks to modify or observe data
- register a content handler which allows transformation or displaying of data


## Boilerplate

In order to make a new plugin `myPlugin` we create a new folder `src/plugins/myPlugin` and a `plugin.js` file with the following content:

```
import { AbstractPlugin, PluginRegistry } from "core/plugin"

class MyPlugin extends AbstractPlugin {

    get id() {
        return "myPlugin"
    }

    get name() {
        return "My Plugin"
    }

    get description() {
        return "Just my Plugin"
    }

    get defaultActive() {
        // decide whether the plugin should be enabled by default or not
        return true
    }

    init() {
        // here we can add buttons or register hooks
    }
}

PluginRegistry.add(new MyPlugin())

```

Afterwards import the plugin on top of `src/components/app.js` and then it should already show up in the settings section of the API extender:
```
import "plugins/myPlugin/plugin"
```

In the plugin directory you can of course add other files besides `plugin.js` but the following ones are recommended
- `component.js` for all react components of the plugin
- `helper.js` for all helper methods of the plugin

## Header buttons

We can add header buttons in `init()` via the `addHeaderButton()` instance method:

```
init() {
    this.addHeaderButton({ id: "hello", name: "My plugin button" })
}
```
The `id` is mandatory and all other props are passed throught to a `<Button>` component, except for the `onClick` property which is not allowed.

The click handler must instead be registered by the `setButtonHandler()` method:
```
    this.setButtonHandler('hello', ({ ctx, plugin }) => console.log(plugin.name))
```
The click handler receives the AppContext `ctx` and the plugin instance as `plugin`.

Usually header buttons will open a new window, which can be achieved as follows:

`plugin.js`:
```
import { MyPluginWindow } from "./components"
...

class MyPlugin extends AbstractPlugin {

    ...

    init() {
        this.addHeaderButton({ id: "load", name: "My plugin button" })
    }

    getWindows() {
        return <MyPluginWindow />
    }
}
````

`components.js`:
```
import { useEffect } from "react"
import { useModalWindow } from "components/modal"

function Hello() {
    return <div>Hello</div>
}

function MyPluginWindow({ plugin }) {
    const MyPluginModal = useModalWindow()

    useEffect(() => {
        // register click handler here because we need the window handler
        plugin.setButtonHandler("hello", () => {
            MyPluginModal.open({})
        })
    }, [])

    return (
        <MyPluginModal.content name="My Plugin" width="70%" height="100%">
            <Hello />
        </MyPluginModal.content>
    )
}

export { MyPluginWindow }
```
All windows which are used in the plugin must be returned in the `getWindows()` method of the plugin.


## Code block buttons

Code block buttons are similiar to the header buttons explained above but they can be added conditionally by passing a check method as `isActive`:

```
    init() {
        this.addBlockButton({
            id: "log-json",
            name: "My conditional button",
            isActive: ({ type }) => type === 'json'
        })
        this.setButtonHandler("log-json", ({ content }) => {
            console.log('JSON content', content)
        })
    }
```
The `isActive` and the button handler both get all properties which were passed to the `<CodeBlock>` component

## Widget

A plugin can add a widget to the dashboard. A widget is just a React component and can be returned by the `getWidget()` instance method of the plugin:

`plugin.js`:
```
import { MyWidget } from "./components"

class MyPlugin extends AbstractPlugin {
    ...

    getWidget(props) {
        return <MyWidget key={this.id} {...props} />
    }
}

```
`components.js`:
```
function MyWidget() {
    return <div>hello</div>
}
```


## Hooks

A plugin can register a hook callback via `addHook()` as follows:
```
import { AbstractPlugin, PluginRegistry, HOOKS } from "core/plugin"

class MyPlugin extends AbstractPlugin {
    ...

    init() {
        ...
        this.addHook(HOOKS.FETCH_CONTENT, (request) => {
            console.log("My hook...", request)
        })
    }
}

```
The frontend provides the following hooks:

| Hook    | Description |
| --------- | ----------- |
| FETCH_CONTENT    | Is called when new content is fetched from the API and receives the request as first parameter |

## Content Handler

TBD