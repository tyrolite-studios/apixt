import { Fragment } from "react"
import { ButtonGroup, getActionResolvedButtons } from "../components/form.js"

const EXT_TYPE = {
    LIST: 1,
    TREE: 2,
    TABLE: 3
}

const EXT_NAME = {
    [EXT_TYPE.LIST]: "list",
    [EXT_TYPE.TREE]: "tree",
    [EXT_TYPE.TABLE]: "table"
}

const EXT_SKIP = {
    IGNORE: 1,
    FILTER: 2,
    HIDDEN: 4,
    PAGE: 8
}

const Extension = ({
    id, tools = {}, types, events, getBaseSort, prepareViewParams, finalizeView, finalizeViewParams, viewPreProps, viewBuildProps, viewPostProps, buildApi, uses = [], modals = []
}) => {
    if (!id) throw Error(`Extension must have an id`)

    return {
        id,
        types,
        events,
        tools,
        prepareViewParams,
        finalizeViewParams,
        finalizeView,
        getBaseSort,
        viewPreProps,
        viewBuildProps,
        viewPostProps,
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

const ExtensionPack = (type, ...exts) => {
    const apis = {}
    const tools = {}
    const modals = []
    const inits = {}
    const prepViewParams = {}
    const finViewParams = {}
    const finView = {}
    const depsMap = new Map()
    const toolToApi = {}
    const extIds = []
    const events = []
    const viewPostProps = []
    const viewPreProps = []
    const viewBuildProps = []
    let ref = {
        plugProps: {},
        hotkeyActions: undefined,
        itemAction: undefined,
        emptyMsg: undefined,
        getItemColor: undefined,
        errorHandler: undefined,
        baseSort: undefined,
        doConfirmed: () => {}
    }
    const buttonsAndDivGroupProps = {}
    const bgBottomElems = [[], [], []]
    const bgTopElems = [[], [], []]
    const renderStages = []

    for (const ext of exts) {
        const api = {}
        if (ext.types && !ext.types.includes(type))
            throw Error(`Extension ${ext.id} cannot be used with component of type ${EXT_NAME[type]}`)

        apis[ext.id] = api
        extIds.push(ext.id)
        modals.push(...ext.modals)
        if (ext.events) {
            for (const [event, handler] of Object.entries(ext.events)) {
                events.push([event, handler])
            }
        }
        for (const [id, getter] of Object.entries(ext.tools)) {
            tools[id] = getter
            toolToApi[id] = api
        }
        inits[ext.id] = ext.buildApi ?? noop
        depsMap.set(ext.id, ext.uses)
        prepViewParams[ext.id] = ext.prepareViewParams ?? noop
        finViewParams[ext.id] = ext.finalizeViewParams ?? noop
        finView[ext.id] = ext.finalizeView ?? noop
        if (ext.viewPreProps) {
            viewPreProps.push(ext.viewPreProps)
        }
        if (ext.viewBuildProps) {
            viewBuildProps.push(ext.viewBuildProps)
        }
        if (ext.viewPostProps) {
            viewPostProps.push(ext.viewPostProps)
        }
        if (ext.getBaseSort) ref.getBaseSort = ext.getBaseSort
    }

    const has = id => extIds.includes(id)

    const api = {
        buttonsAndDivGroupProps,
        addButtonsAndDivGroupProps(props) {
            Object.assign(buttonsAndDivGroupProps, props)
        },
        api: apis,
        events,
        get plugProps() {
            return ref.plugProps
        },
        set plugProps(value) {
            ref.plugProps = value
        },
        get hotkeyActions() {
            return ref.hotkeyActions
        },
        set hotkeyActions(value) {
            ref.hotkeyActions = value
        },
        viewPreProps,
        viewBuildProps,
        viewPostProps,
        getSortedIds() {
            const ids = Object.keys(inits)
            const visited = new Set()
            const temp = new Set()
            const result = []

            const visit = (id) => {
                if (visited.has(id)) return
                if (temp.has(id)) throw Error(`Circular dependency detected on extension "${id}"`)

                temp.add(id)
                const deps = depsMap[id] || []
                for (const dep of deps) {
                    if (!ids.includes(dep)) continue

                    visit(dep)
                }
                temp.delete(id)
                visited.add(id)
                result.push(id)
            }
            for (const id of ids) {
                if (!visited.has(id)) visit(id)
            }
            return result
        },
        has,
        setGetEmptyMsg(value, prio) {
            if (!ref.emptyMsg || prio > ref.emptyMsg[1]) {
                ref.emptyMsg = [value, prio]
            }
        },
        get getEmptyMsg() {
            return ref.emptyMsg ? ref.emptyMsg[0] : undefined
        },

        init(ids) {
            for (const id of ids) {
                const init = inits[id]
                const api = apis[id]
                Object.assign(api, init({ api, ...ref.plugProps }))
            }
        },

        prepareViewParams(ids, viewParams) {
            for (const id of ids) {
                prepViewParams[id](viewParams)
            }
        },
        finalizeViewParams(ids, viewParams) {
            for (const id of ids) {
                finViewParams[id](viewParams)
            }
        },

        finalizeView(ids, view, deps) {
            for (const id of ids) {
                finView[id](view, deps)
            }
        },

        get modals() {
            if (!modals.length) return

            if (modals.length === 1) return modals[0]

            return (
                <>
                    {modals.map(((x, i) => <Fragment key={i}>{x}</Fragment>))}
                </>
            )
        },

        addModal(modal) {
            modals.push(modal)
        },

        get hotkeyItemActions() {
            return ref.hotkeyActions && ref.hotkeyActions.itemActions
        },

        get hotkeyToolbarActions() {
            return ref.hotkeyActions && ref.hotkeyActions.toolbarActions
        },

        setHotkeyItemAction(hotkey, action) {
            api.hotkeyItemActions[hotkey] = action
        },

        setHotkeyItemActions(hotkey2action) {
            for (const [hotkey, action] of Object.entries(hotkey2action)) {
                api.hotkeyItemActions[hotkey] = action
            }
        },

        setHotkeyToolbarAction(hotkey, action) {
            api.hotkeyToolbarActions[hotkey] = action
        },

        setHotkeyToolbarActions(hotkey2action) {
            for (const [ hotkey, action ] of Object.entries(hotkey2action)) {
                api.hotkeyToolbarActions[hotkey] = action
            }
        },

        getToolbarButtonGroup({ key, buttons = [], ...props }) {
            const resolvedButtons = getActionResolvedButtons(
                buttons,
                {
                    hotkeySetter: !has('hotkeys') ? undefined : (...params) => api.setHotkeyToolbarAction(...params),
                    doConfirmed: ref.doConfirmed
                }
            )
            return <ButtonGroup key={key} {...props} buttons={resolvedButtons} />
        },

        get doConfirmed() {
            return ref.doConfirmed
        },

        set doConfirmed(value) {
            ref.doConfirmed = value
        },

        setItemAction(action, prio) {
            if (ref.itemAction && ref.itemAction[1] > prio) return

            ref.itemAction = [ action, prio ]
        },

        get itemAction() {
            return ref.itemAction ? ref.itemAction[0] : undefined
        },

        setGetItemColor(colorCallback, prio) {
            if (ref.getItemColor && ref.getItemColor[1] > prio) return

            ref.getItemColor = [colorCallback, prio]
        },

        getBaseSort(deps) {
            return ref.getBaseSort ? ref.getBaseSort(deps) : undefined
        },

        getPostSort(deps) {
            return ref.getBaseSort ? ref.getBaseSort(deps, true) : undefined
        },

        get getItemColor() {
            return ref.getItemColor ? ref.getItemColor[0] : undefined
        },

        getToolElem(id, props = {}) {
            const getElem = tools[id]
            if (!getElem) return

            const api = toolToApi[id]
            return getElem({ ...ref.plugProps, ...props, api })
        },

        addRenderStage(getElem, prio) {
            insertSortedByPrio(renderStages, [ getElem, prio ])
        },

        addGetBgTopElem(pos, getElem, prio) {
            insertSortedByPrio(bgTopElems[pos], [ getElem, prio ])
        },

        addGetBgBottomElem(pos, getElem, prio) {
            insertSortedByPrio(bgBottomElems[pos], [getElem, prio])
        },

        get bgTopElems() {
            return getBgElems(bgTopElems)
        },

        get bgBottomElems() {
            return getBgElems(bgBottomElems)
        },

        get errorHandler() {
            return ref.errorHandler
        },

        set errorHandler(handler) {
            ref.errorHandler = handler
        },

        get virtualSize() {
            return ref.virtualSize
        },

        set virtualSize(virtualSize) {
            return ref.virtualSize = virtualSize
        },

        process({ ...cmd }, op = 'exec') {
            let callback
            const hasBlocking = has('blocking') && cmd.block !== false
            callback = async () => {
                let restore
                try {
                    if (hasBlocking) {
                        api.api.blocking.startBlocking(
                            !cmd.abort ? undefined : () => {
                                cmd.isAborted = true
                                cmd.abort()
                            }
                        )
                    }
                    if (has('snapshot')) {
                        restore = await api.api.snapshot.getRestoreForCmd(cmd)
                    }
                    await cmd[op]()
                    if (cmd.isAborted) throw new DOMException("Operation aborted", "AbortError")

                    if (hasBlocking) {
                        this.api.blocking.stopBlocking()
                    }
                    if (has('undo')) {
                        if (false && op === 'exec' && restore && cmd.undo === true) {
                            const redo = await apis.snapshot.getRestore()
                            cmd.undo = async () => restore()
                            cmd.redo = async () => redo()
                        }
                        if (apis.undo.canProcess(cmd)) {
                            apis.undo.updateHistory(cmd, op)
                        }
                    }
                } catch (e) {
                    if (restore) {
                        await restore()
                    }
                    if (hasBlocking) {
                        apis.blocking.stopBlocking()
                    }
                    if (e.name === 'AbortError') return

                    console.error(e)
                    const handler = cmd.handleError ? cmd.handleError : ref.errorHandler
                    handler(cmd, e)
                }
            }
            if (callback) setTimeout(callback)
        },

        getContentElem(render, node) {
            let index = 0
            if (type === EXT_TYPE.TABLE) {

                const elems = []
                for (const [ col, cellElem ] of render(node).entries()) {
                    elems.push(
                        <div key={index + '_' + col}>
                            {cellElem}
                        </div>
                    )
                }
                return <div key={'r' + index} className="contents">
                    {elems}
                </div>
            }

            let elem = <div key={'r' + index} className="auto text-xs">
                {render(node)}
            </div>

            while (index < renderStages.length) {
                const [getElem] = renderStages[index]
                elem = getElem({ key: 'r' + index, elem, node, ...ref.plugProps })
                index++
            }
            return elem
        }
    }
    return api
}

export {
    ExtensionPack,
    Extension,
    EXT_TYPE,
    EXT_NAME,
    EXT_SKIP
}