import { useContext, useMemo, useRef, useState, useEffect } from "react"
import { ClassNames } from "../core/helper.js"
import { Div, getSpacingCls } from "../components/layout.js"
import { EXT_TYPE } from "core/extension"
import { getCols, useGetNewAttrWithDimProps } from "components/common"
import { getToolBarElems, InfoElems, useUnrenderedExtComponent } from "../components/ext-components.js"
import { getActionResolvedButtons } from "../components/form.js"

function useUnrenderedTableComponent({ entityIndex, ...props }) {
    return useUnrenderedExtComponent(EXT_TYPE.TABLE, { entityIndex, ...props })
}

function useTableComponent({ entityIndex, match, skip, extensions, header, footer, ...props }) {
    const table = useUnrenderedTableComponent({ entityIndex, match, skip, extensions, header, footer })
    return <ExtTableRenderer table={table} { ...props } />
}

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

    const itemsCls = new ClassNames('grid text-xs grid-cols-[repeat(3,max-content)] gap-[2px] item-start auto')
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
        useFocusGroupsOnItemContainer({ container })
    } else if (exts.has('focus')) {
        useFocusOnItemContainer({ container, moveFocus: exts.api.focus.moveFocus })
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
//            <div className="stack-h full py-d1y">
                exts.getContentElem(render, node)
//            </div>
        )
        const clickAction = exts.itemAction
        let elem = itemActions ? (
            <ButtonsAndDivGroup
                key={filter + index}
                buttons={getItemActions(index)}
                moreCols={colsItems}
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
        ) : nodeElem
            /*
            (
            <Div key={filter + index} {...item.attr.props} className={itemCls.value + ' item'}>
                {nodeElem}
            </Div>
        )

             */
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

function ExtTable({ exts, ...props }) {
    const itemActions = exts.has('itemActions') ? exts.api.itemActions.getButtons(exts.plugProps) : null
    if (itemActions) {
        return (
            <FocusRowCtx>
                <ExtTableInner exts={exts} {...props} itemActions={itemActions} />
            </FocusRowCtx>
        )
    }
    return <ExtStackInner exts={exts} {...props} itemActions={undefined} />
}

function ExtTableRenderer({ table, colsBar, className, ...props }) {

    const { exts, areaRef, header, footer, entityIndex, view, container, viewParams } = table

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
                            <ExtTable
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

function ExtTableRenderer2({ table, renderer, headerRenderer, spacing = 2, columns = 3, className }) {

    const cls = ClassNames("grid text-xs grid-cols-[repeat(3,max-content)] gap-[2px] item-start bg-header-bg/25 text-header-text", className)
    const rows = []
    const rowCls = ClassNames("row contents")

    const { view } = table

    if (headerRenderer) {
        const elems = headerRenderer()
        rows.push(
            <div className="contents" key={-1}>{
                elems.map((x, i) => <div key={i} className="p-2 bg-block-bg text-block-text">{x}</div>)
            }</div>
        )
    }

    const { nodes } = view
    for (const [ key, meta ] of nodes.entries()) {
        const elems = renderer(meta)
        rows.push(<div className="contents" key={key}>{
            elems.map((x, i) => <div key={i} className="p-2 hover:brightness-110 bg-input-bg text-input-text">{x}</div>)
        }</div>)
    }

    return (
        <Div className="overflow-y-auto border border-input-border" maxHeight={300}>
            <div className="full px-d2x py-d2y bg-input-bg text-input-text">
                <div className={cls.value}>
                    {rows}
                </div>

            </div>
        </Div>
    )
}

export {
    ExtTableRenderer,
    useTableComponent,
    useUnrenderedTableComponent
}