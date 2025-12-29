import { Div } from "components/layout"
import { ClassNames, isString } from "core/helper"
import {
    getCols,
    useFocusOnItemContainer,
    useFocusGroupsOnItemContainer,
    FocusRowCtx,
    useGetNewAttrWithDimProps,
} from "components/common"
import { getSpacingCls } from "components/layout"
import { ButtonsAndDivGroup } from "components/form"
import { getActionResolvedButtons } from "../components/form.js"
import { EXT_TYPE } from "core/extension"
import { useUnrenderedExtComponent, InfoElems, getToolBarElems } from "../components/ext-components.js"

function ExtStackInner({
        exts,
        view,
        viewParams,
        container,
        className,
        itemClassName,
        innerClassName,
        render = item => item.entity.name,
        itemActions,
        spacing = 1,
        cols = 'header/25',
        colsItems = 'input',
        colsInner = colsItems,
        wrap = true,
        bordered = true,
        padded = true,
        sized = true,
        colored = true,
        styled = true,
        getEmptyMsg
    }) {
    const { nodes } = view
    const { filter = '' } = viewParams

    const itemsCls = new ClassNames('stack-v auto')
    itemsCls.addIf(true, 'bg-header-bg/25 text-header-text')

    // const cls = new ClassNames("relative stack-v item-start", className)
    const bgDivCls = new ClassNames("auto stack-v")
    // bgDivCls.addIf(styled && padded, 'px-d2x py-d2y')

    // const outerCls = new ClassNames("stack-v relative overflow-hidden auto full")

    let colItemsCls = ''
    if (styled && colored) {

        const colComp = getCols(cols)
        const colCompCls = `${colComp.bg} ${colComp.color}`

        if (colsInner === cols) {
            // outerCls.add(colCompCls)
        } else {
            // cls.add(colCompCls)
            const colInner = getCols(colsInner)
            bgDivCls.add(colInner.bg)
            bgDivCls.add(colInner.color)
        }
        const colItems = getCols(colsItems)
        colItemsCls = `${colItems.bg} ${colItems.color}`
    }
    // outerCls.addIf(styled && bordered, "border")
    // outerCls.addIf(styled && bordered && colored, "border-input-border")

    if (itemActions) {
        useFocusGroupsOnItemContainer({ container, count: view.viewCount })
    } else if (exts.has('focus')) {
        useFocusOnItemContainer({
            container,
            // moveFocus: exts.api.focus.moveFocus,
            count: view.viewCount
        })
    }

    // cls.addIf(full, "full")
    // cls.addIf(!wrap, "text-nowrap")

    let getItemActions = () => []
    if (itemActions) {
        getItemActions = index => {
            const node = nodes[index]
            return getActionResolvedButtons(
                itemActions,
                {
                    params: [node],
                    hotkeySetter: (...params) => exts.setHotkeyItemAction(...params),
                    props: {keepFocus: true},
                    doConfirmed: exts.doConfirmed
                }
            )
        }
    }

    let elems = []

    const divider = getSpacingCls(spacing)
    let isInteractive = null
    const getItemColor = exts.getItemColor

    for (const [ index, node ] of nodes.entries()) {
        if (!node.visible) continue

        const item = container.getItem(index)
        const itemCls = new ClassNames('item-node', itemClassName)
        if (isInteractive === null) {
            isInteractive = item.attr.has('onClick') || item.attr.has('onMouseDown')
        }
        itemCls.addIf(isInteractive, "hover:brightness-110")
        if (isInteractive) {
            item.attr.setStyle('cursor', 'pointer')
        }
        const btnCls = new ClassNames('items-start')
        itemCls.addIf(!itemActions, divider)
        itemCls.addIf(
            !itemActions,
            "focus:z-10 focus:outline-none focus:ring focus:ring focus:ring-focus-border focus:border-0"
        )
        itemCls.addIf(styled && sized, "text-sm")
        if (styled && padded) {
            itemCls.add("px-d2x py-d2y")
            btnCls.add("px-d2x py-d2y")
        }
        itemCls.addIf(!wrap, "truncate")

        if (styled && colored) {
            const color = getItemColor ? getItemColor({ node }) : undefined
            itemCls.addIf(
                color, color, colItemsCls
            )
        }
        if (itemActions) itemCls.add("auto full")

        const nodeElem = (
            <div className="stack-h full py-d1y">
                {exts.getContentElem(render, node)}
            </div>
        )
        const clickAction = exts.itemAction
        let elem = itemActions ? (
            <ButtonsAndDivGroup
                key={filter + index}
                buttons={getItemActions(index)}
                moreCols={colsItems}
                parent={container}
                action={
                    !clickAction ? undefined : () => {
                        const id = node.nodeType + ' ' + node.value
                        clickAction({ id, index, node, ...exts.plugProps })
                    }
                }
                rowIndex={elems.length}
                buttonsClassName={btnCls.value}
                className={'item items-stretch ' + colItemsCls + ' ' + (divider ? divider : '') }
                { ...exts.buttonsAndDivGroupProps }
            >
                <Div {...item.attr.props} className={itemCls.value}>
                    {nodeElem}
                </Div>
            </ButtonsAndDivGroup>
        ) : (
            <Div key={filter + index} {...item.attr.props} className={itemCls.value + ' item'}>
                {nodeElem}
            </Div>
        )
        elems.push(elem)
    }
//    elems.push(<div className="auto stack-v"></div>)
    // const bgCls = new ClassNames("w-full stack-v")
    const bgCls = new ClassNames('auto stack-v')
    bgCls.addIf(elems.length, 'shadow-inner shadow-2xl')

    const bgBottomElems = []
    if (!elems.length) {
        // bgCls.add('auto')
        // cls.add('full')
        bgBottomElems.push(
            <div key="e" className="text-xs px-d2x py-d2y auto stack-v full">
                {getEmptyMsg ? getEmptyMsg(exts.plugProps) : <div className="grid auto place-items-center">No items available</div>}
            </div>
        )
    }
    const topInfoElems = exts.bgTopElems
    if (topInfoElems.length) {
        elems.unshift(
            <div key={-1}><InfoElems key="t" elems={topInfoElems} /></div>
        )
    }

    const bottomInfoElems = exts.bgBottomElems
    if (bottomInfoElems.length) {
        bgBottomElems.push(
            <InfoElems key="b" elems={bottomInfoElems} />
        )
    }
    if (bgBottomElems.length) {
        elems.push(
            <div key={-2} className={bgCls.value}>{bgBottomElems}</div>
        )
    } else {
        elems.push(<div key={-2} className={bgCls.value} />)
    }
    return (
        <Div
            className={itemsCls.value}
            {...container.attr.props}
        >
            {elems}
        </Div>
    )
}

function ExtStack({ exts, ...props }) {
    const itemActions = exts.has('itemActions') ? exts.api.itemActions.getButtons(exts.plugProps) : null
    if (itemActions) {
        return (
            <FocusRowCtx>
                <ExtStackInner exts={exts} {...props} itemActions={itemActions} />
            </FocusRowCtx>
        )
    }
    return <ExtStackInner exts={exts} {...props} itemActions={undefined} />
}

function ExtStackRenderer({ list, colsBar, className, ...props }) {

    const { exts, areaRef, header, footer, entityIndex, view, container, viewParams } = list

    // TODO: check this...
    const { styled = true, boxed, color = true, padded = true } = props
    if (!colsBar) colsBar = boxed ? 'header/50' : 'header/0'

    const isCompact = exts.has('compact') && exts.api.compact.isActive
    const headerElems = container ? getToolBarElems({
        value: isCompact ? exts.api.compact.toolbar : header,
        exts
    }) : ''
    const footerElems = container ? getToolBarElems({
        value: isCompact ? "" : footer,
        exts
    }) : ''

    const cls = ClassNames("stack-v full", className)
    cls.addIf(!boxed, "gap-y-d1y")

    const wrapStackCss = "stack-h flex-wrap items-center gap-x-d2x gap-y-d2y py-d1y"
    const headerCls = ClassNames(wrapStackCss)
    const footerCls = ClassNames(wrapStackCss)

    if (styled && color) {
        const cols = getCols(colsBar)
        headerCls.add(cols.bg)
        footerCls.add(cols.bg)
        headerCls.add(cols.color)
        footerCls.add(cols.color)
    }

    headerCls.addIf(boxed, "px-d1x border-input-border")
    headerCls.addIf(styled && isCompact, "border", boxed ? "border-x border-t" : "")
    footerCls.addIf(styled && boxed, "border-x border-b px-d2x border-input-border")

    const attr = useGetNewAttrWithDimProps(props)
    attr.tabIndex = -1

    const stackCls = ClassNames("overflow-y-auto")
    stackCls.addIf(true, "border border-input-border bg-input-bg text-input-text")
    const paddingCls = ClassNames("stack-v auto min-h-full")
    paddingCls.addIf(true, "px-d2x py-d2y")

    return (
        <>
            <Div ref={areaRef} className={cls.value}>
                {headerElems.length > 0 && <div className={headerCls.value}>
                    {headerElems}
                </div>
                }

                {!isCompact &&
                    <Div className={stackCls.value} {...attr.props}>
                        <div className={paddingCls.value}>
                            <ExtStack
                                full
                                container={container}
                                view={view}
                                entityIndex={entityIndex}
                                viewParams={viewParams}
                                exts={exts}
                                getEmptyMsg={exts.getEmptyMsg}
                                { ...props }
                            />

                        </div>
                    </Div>
                }

                {footerElems.length > 0 && !isCompact && <div className={footerCls.value}>
                    {footerElems}
                </div>
                }
            </Div>
            {exts && exts.modals}
        </>
    )
}

function useUnrenderedStackComponent(props) {
    return useUnrenderedExtComponent(EXT_TYPE.LIST, props)
}

function useStackComponent({ entityIndex, match, skip, extensions, header, footer, ...props }) {
    const list = useUnrenderedStackComponent({ entityIndex, match, skip, extensions, header, footer })
    return <ExtStackRenderer list={list} { ...props } />
}

export {
    ExtStackRenderer,
    useStackComponent,
    useUnrenderedStackComponent
}
