import { useConfirmation, useErrorWindow, useItemContainer, useUpdateOnEntityIndexChanges } from "./common.js"
import { useEffect } from "react"
import { useMemo, useRef } from "react"
import { ClassNames, isString } from "core/helper"
import { EXT_SKIP, ExtensionPack } from "core/extension"

function InfoElems({ elems, className }) {
    const cls = ClassNames("stack-h w-full px-d2x py-d2y gap-x-d2x text-xs", className)
    const stack = []
    const dir2justify = {
        'l': '',
        'c': 'justify-center',
        'r': 'justify-end'

    }
    for (const [dir, ...subElems ] of elems) {
        const cls = "flex auto " + dir2justify[dir]
        stack.push(<div key={dir} className={cls}>{subElems}</div>)
    }

    return <div key={1} className={cls.value}>
        {stack}
    </div>
}

function getToolBarElems({ value, exts }) {
    if (!value) return []

    if (isString(value)) value = value.split(" ")

    const elems = []
    let maxElem = value.length
    for (const [index, group] of value.entries()) {
        let elem
        switch (group) {
            case "auto":
                maxElem--
                elem = <div key={index} className="auto" />
                break

            default:
                elem = exts.getToolElem(group, { key: group + index })
                break
        }
        if (elem) {
            if (elems.length && index < maxElem && group !== 'auto') {
                const sepCls = true ?
                    "w-[2px] h-6 bg-header-bg/75" :
                    "stack-h px-d1x divide-x divide-input-border divide-opacity-40";
                elems.push(<div key={"g" + index} className="px-d2x"><div
                    key={'d' + index}
                    className={sepCls}
                ></div></div>)
            }
            elems.push(elem)
        }
    }
    return elems
}

const abortedSkips = EXT_SKIP.IGNORE | EXT_SKIP.FILTER

function useUnrenderedExtComponent(componentType, {  entityIndex, viewPreProps = [], match, skip, extensions = [], header = '', footer = ''  }) {
    const ConfirmModal = useConfirmation()

    const ErrorWindow = useErrorWindow()
    const areaRef = useRef(null)
    const containerRef = useRef(null)
    useUpdateOnEntityIndexChanges(entityIndex)

    const exts = ExtensionPack(componentType, ...extensions)
    const extIds = useMemo(() => {
        return exts.getSortedIds()
    }, [])

    let temp = {
        baseIndex: 0,
    }
    let viewParams = {
        cacheBaseBy: [entityIndex.lastModified],
        temp,
        componentType
    }
    exts.prepareViewParams(extIds, viewParams)
    exts.finalizeViewParams(extIds, viewParams)

    const deps = { viewParams, entityIndex, temp }
    const viewPrePropsHandler = [
        ...viewPreProps,
        ...exts.viewPreProps
    ]
    const allNodes = useMemo(() => {
        // TODO: cache match result if match exists
        const indices = entityIndex.getMatchingEntities(match)
        const nodes = []
        for (const index of indices) {
            let cached = undefined
            // search & pre-sort should work on all base-items
            //  => preBuild
            const node = {
                id: entityIndex.getEntityValue(index),
                index,
                get entity() {
                    if (!cached) {
                        cached = entityIndex.getEntityObject(index)
                    }
                    return cached
                }
            }
            for (const handler of viewPrePropsHandler) {
                handler(node, deps)
            }
            nodes.push(node)
        }
        const baseSort = exts.getBaseSort(deps)
        if (baseSort) nodes.sort(baseSort)

        return nodes
    }, viewParams.cacheBaseBy)
    deps.allNodes = allNodes

    const nodes = []
    let viewIndex = 0
    let viewCount = 0
    let hidden = 0
    let postProcessDirectly = !viewParams.postSorting && !viewParams.requireTotalInPostProps

    const buildViewNodeProps = (node) => {
        node.viewIndex = null
        // skipAbort => don't count in view, don't count outside
        // skipFiltered => don't count in view, count as outside
        // skipHidden => count in view, don't count outside

        // tritt ein in folgenden Fällen:
        //   - knoten ist in einem skip-tree (=> skipAbort)
        //   - set aktiv und id nicht im set (=> skipFiltered)
        //   - filter aktiv und knoten passt nicht auf filter (=> skipFiltered)
        //   - tree und knoten hat einen collapsed parent (=> skipHidden)
        node.skip = 0
        for (const handler of exts.viewBuildProps) {
            handler(node, deps)
        }
        temp.baseIndex++
    }

    const addOrSkipViewNode = (node) => {
        if (node.skip) {
            if (node.skip & abortedSkips) return

            hidden++
            return
        }
        viewCount++
        nodes.push(node)
        if (postProcessDirectly) setNodeVisibility(node)
    }

    const setNodeVisibility = (node, max) => {
        node.viewIndex = viewIndex

        /*
        for (const handler of exts.viewPostProps) {
            handler(viewIndex, node, max)
        }
        node.visible = node.skip === 0
        if (node.visible) {
            pageCount++
        }
         */
        viewIndex++
    }

    if (viewParams.skipNodesAfterBuild) {
        for (const node of allNodes) {
            buildViewNodeProps(node)
        }
        for (const node of allNodes) {
            addOrSkipViewNode(node)
        }
    } else {
        for (const node of allNodes) {
            buildViewNodeProps(node)
            addOrSkipViewNode(node)
        }
    }
    if (!postProcessDirectly) {
        if (viewParams.postSorting) {
            nodes.sort(exts.getPostSort(deps))
        }
        for (const node of nodes) {
            setNodeVisibility(node, nodes.length)
        }
    }
    const view = {
        totalCount: allNodes.length,
        viewCount,
        viewCountWithHidden: viewCount + hidden,
        pageStart: 0,
        pageEnd: viewCount - 1,
        nodes,
        allNodes
    }
    exts.finalizeView(extIds, view, deps)
    view.pageCount = view.pageEnd - view.pageStart + 1

    const extsRef = useRef(null)

    const container = useItemContainer({
        view: true,
        items: nodes,
        viewStart: view.pageStart,
        viewEnd: view.pageEnd,
        item2value: x => entityIndex.getEntityValue(x.index),
        value2item: (value) => entityIndex.getEntityByPropValue('value', value)
    })
    containerRef.current = container
    extsRef.current = exts
    temp = undefined
    const plugProps = {
        entityIndex,
        view,
        viewParams,
        exts,
        container,
        containerRef,
        areaRef
    }
    if (exts.events.length) {
        useEffect(() => {
            for (const [event, handler] of exts.events) {
                areaRef.current.addEventListener(event, handler)
            }
        }, [])
    }
    exts.plugProps = plugProps
    exts.addModal(ConfirmModal.Modals)
    exts.addModal(ErrorWindow.Modal)
    exts.doConfirmed = (msg, confirmed) => ConfirmModal.open({ msg, confirmed })
    exts.init(extIds)
    exts.errorHandler = async () => {
        ErrorWindow.open({message: `The execution failed!`})
    }
    const clickAction = exts.itemAction
    if (clickAction) {
        container.naviRef.current.setKeyEvents({
            ' ': (focusIndex) => {
                const index = container.viewStart + focusIndex
                const node = container.items[container.viewStart + index]
                const id = node.value
                clickAction({ id, index, node, ...plugProps })
            }
        }, 60)
        container.addItemBuilder((index, item) => {
            item.attr.addListener("onClick", () => {
                const node = container.items[index]
                const id = node.value
                clickAction({ id, index, node, ...plugProps })
            })
        })
    }
    return {
        ...plugProps,
        header,
        footer,
        areaRef
    }
}

export {
    useUnrenderedExtComponent,
    InfoElems,
    getToolBarElems
}