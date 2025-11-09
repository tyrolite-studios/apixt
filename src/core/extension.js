import { Fragment } from "react"
import { d } from "core/helper"
import { ButtonGroup, getActionResolvedButtons } from "../components/form.js"

const Extension = ({
    id, tools = {}, prepareViewParams, buildApi, uses = [], modals = []
}) => {
    if (!id) throw Error(`Extension must have an id`)

    return {
        id,
        tools,
        prepareViewParams,
        buildApi,
        modals,
        uses
    }
}

const noop = () => {}

const getBgElems = (source) => {
    const elems = []
    let key = 0
    const dir = ['l', 'c', 'r']
    for (const [index, row] of source.entries()) {
        const subElems = []
        for (const [handler] of row) {
            const elem = handler({ key })
            if (!elem) continue

            key++
            subElems.push(elem)
        }
        if (!subElems.length) continue

        elems.push([ dir[index], ...subElems ])
    }
    return elems
}

const addBgElem = (target, getElem, prio) => {
    insertSortedByPrio(target, [getElem, prio])
}

function insertSortedByPrio(arr, element) {
    const [, prio] = element
    let left = 0
    let right = arr.length

    while (left < right) {
        const mid = (left + right) >> 1
        if (arr[mid][1] < prio) {
            left = mid + 1
        } else {
            right = mid
        }
    }
    arr.splice(left, 0, element)
}

class ExtensionPack {
    constructor (...exts) {
        const apis = {}
        const tools = {}
        const modals = []
        const inits = {}
        const prepViewParams = {}
        const deps = new Map()
        const toolToApi = {}
        const ids = []

        for (const ext of exts) {
            const api = {}
            apis[ext.id] = api
            ids.push(ext.id)
            modals.push(...ext.modals)
            for (const [id, getter] of Object.entries(ext.tools)) {
                tools[id] = getter
                toolToApi[id] = api
            }
            inits[ext.id] = ext.buildApi ?? noop
            deps.set(ext.id, ext.uses)
            prepViewParams[ext.id] = ext.prepareViewParams ?? noop
        }
        this._ids = ids
        this._apis = apis
        this._tools = tools
        this._modals = modals
        this._inits = inits
        this._deps = deps
        this._plugProps = {}
        this._toolToApi = toolToApi

        // this._viewParams = viewParams
        this._prepViewParams = prepViewParams
        this._getEmptyMsg = undefined
        this._itemAction = undefined
        this._hotkeyActions = undefined
        this._getItemColor = undefined
        this._buttonsAndDivGroupProps = {}
        this._bgBottomElems = [[], [], []]
        this._bgTopElems = [[], [], []]
        this._renderStages = []
        this._doConfirmed = () => {}
    }

    addButtonsAndDivGroupProps(props) {
        Object.assign(this._buttonsAndDivGroupProps, props)
    }

    get buttonsAndDivGroupProps () {
        return this._buttonsAndDivGroupProps
    }

    getSortedIds() {
        const ids = Object.keys(this._apis)

        const visited = new Set()
        const temp = new Set()
        const result = []

        const visit = (id) => {
            if (visited.has(id)) return
            if (temp.has(id)) throw Error(`Circular dependency detected on extension "${id}"`)

            temp.add(id)
            const deps = this._deps[id] || []
            for (const dep of deps) {
                if (!ids.includes(dep)) continue

                visit(dep)
            }
            temp.delete(id)
            visited.add(id)
            result.unshift(id)
        }
        for (const id of ids) {
            if (!visited.has(id)) visit(id)
        }
        return result
    }

    has(id) {
        return this._ids.includes(id)
    }

    get api() {
        return this._apis
    }

    setGetEmptyMsg(value, prio) {
        if (!this._emptyMsg || prio > this._emptyMsg[1]) {
            this._emptyMsg = [value, prio]
        }
    }

    get getEmptyMsg() {
        return this._emptyMsg ? this._emptyMsg[0] : undefined
    }

    init(ids) {
        for (const id of ids) {
            const init = this._inits[id]
            const api = this._apis[id]
            Object.assign(api, init({ api, ...this._plugProps }))
        }
    }

    prepareViewParams(ids, viewParams) {
        for (const id of ids) {
            this._prepViewParams[id](viewParams)
        }
    }

    get modals() {
        if (!this._modals.length) return

        if (this._modals.length === 1) return this._modals[0]

        return (
            <>
                {this._modals.map(((x, i) => <Fragment key={i}>{x}</Fragment>))}
            </>
        )
    }

    get hotkeyActions() {
        return this._hotkeyActions
    }

    set hotkeyActions(value) {
        this._hotkeyActions = value
    }

    get hotkeyItemActions() {
        return this._hotkeyActions.itemActions
    }

    get hotkeyToolbarActions() {
        return this._hotkeyActions.toolbarActions
    }

    setHotkeyItemAction(hotkey, action) {
        this.hotkeyItemActions[hotkey] = action
    }

    setHotkeyItemActions(hotkey2action) {
        for (const [hotkey, action] of Object.entries(hotkey2action)) {
            this.hotkeyItemActions[hotkey] = action
        }
    }

    setHotkeyToolbarAction(hotkey, action) {
        this.hotkeyToolbarActions[hotkey] = action
    }

    setHotkeyToolbarActions(hotkey2action) {
        for (const [hotkey, action] of Object.entries(hotkey2action)) {
            this.hotkeyToolbarActions[hotkey] = action
        }
    }

    getToolbarButtonGroup({ key, buttons = [], ...props }) {
        const resolvedButtons = getActionResolvedButtons(
            buttons,
            {
                hotkeySetter: (...params) => this.setHotkeyToolbarAction(...params),
                doConfirmed: this.doConfirmed
            }
        )
        return <ButtonGroup key={key} {...props} buttons={resolvedButtons} />
    }

    set doConfirmed (value) {
        this._doConfirmed = value
    }

    get doConfirmed() {
        return this._doConfirmed
    }

    setItemAction(action, prio) {
        if (this._itemAction && this._itemAction[1] > prio) return

        this._itemAction = [action, prio]
    }

    get itemAction() {
        return this._itemAction ? this._itemAction[0] : undefined
    }

    setGetItemColor(colorCallback, prio) {
        if (this._getItemColor && this._getItemColor[1] > prio) return

        this._getItemColor = [colorCallback, prio]
    }

    get getItemColor() {
        return this._getItemColor ? this._getItemColor[0] : undefined
    }

    set plugProps(plugProps) {
        this._plugProps = plugProps
    }

    get plugProps() {
        return this._plugProps
    }

    getToolElem(id, props = {}) {
        const getElem = this._tools[id]
        if (!getElem) return

        const api = this._toolToApi[id]
        return getElem({ ...this._plugProps, ...props, api })
    }

    addRenderStage(getElem, prio) {
        insertSortedByPrio(this._renderStages, [getElem, prio])
    }

    addGetBgTopElem(pos, getElem, prio) {
        insertSortedByPrio(this._bgTopElems[pos], [getElem, prio])
    }

    addGetBgBottomElem(pos, getElem, prio) {
        insertSortedByPrio(this._bgBottomElems[pos], [getElem, prio])
    }

    addModal(modal) {
        this._modals.push(modal)
    }

    get bgTopElems() {
        return getBgElems(this._bgTopElems)
    }

    get bgBottomElems() {
        return getBgElems(this._bgBottomElems)
    }

    get errorHandler() {
        return this._errorHandler
    }

    set errorHandler(handler) {
        this._errorHandler = handler
    }

    process({ ...cmd }, op = 'exec') {
        let callback
        const hasBlocking = this.has('blocking') && cmd.block !== false
        callback = async () => {
            let restore
            try {
                if (hasBlocking) {
                    this.api.blocking.startBlocking(
                        !cmd.abort ? undefined : () => {
                            cmd.isAborted = true
                            cmd.abort()
                        }
                    )
                }
                if (this.has('snapshot')) {
                    restore = await this.api.snapshot.getRestoreForCmd(cmd)
                }
                await cmd[op]()
                if (cmd.isAborted) throw new DOMException("Operation aborted", "AbortError")

                if (hasBlocking) {
                    this.api.blocking.stopBlocking()
                }
                if (this.has('undo')) {
                    if (false && op === 'exec' && restore && cmd.undo === true) {
                        const redo = await this.api.snapshot.getRestore()
                        cmd.undo = async () => restore()
                        cmd.redo = async () => redo()
                    }
                    if (this.api.undo.canProcess(cmd)) {
                        this.api.undo.updateHistory(cmd, op)
                    }
                }
            } catch (e) {
                if (restore) {
                    await restore()
                }
                if (hasBlocking) {
                    this.api.blocking.stopBlocking()
                }
                if (e.name === 'AbortError') return d('EXIT...')

                console.error(e)
                const handler = cmd.handleError ? cmd.handleError : this.errorHandler
                handler(cmd, e)
            }
        }
        if (callback) setTimeout(callback)
    }

    getContentElem(render, node) {
        let index = 0
        let elem = <div key={'r' + index} className="auto text-xs">
            {render(node)}
        </div>

        while (index < this._renderStages.length) {
            const [getElem] = this._renderStages[index]
            elem = getElem({ key: 'r' + index, elem, node, ...this._plugProps })
            index++
        }
        return elem
    }
}

export {
    ExtensionPack,
    Extension
}