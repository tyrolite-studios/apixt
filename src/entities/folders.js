import { useState, useRef, useMemo } from "react"
import { Icon, Div } from "components/layout"
import { ClassNames, isFunction, isString } from "core/helper"
import { ButtonGroup, FormGrid, InputCells } from "components/form"
import {
    getCols,
    useFocusOnItemContainer,
    useFocusGroupsOnItemContainer,
    FocusRowCtx,
    useGetNewAttrWithDimProps
} from "components/common"
import { useModalWindow } from "components/modal"
import { OkCancelLayout, Centered, getSpacingCls } from "components/layout"
import { ButtonsAndDivGroup, CustomCells } from "components/form"
import { ROOT_FOLDER_ID } from "core/entity-tree"
import { getActionResolvedButtons } from "../components/form.js"

function FolderSelector({ folder, close, match, skipFolder, treeIndex, save }) {
    const [selection, setSelection] = useState(() => {
        if (folder === undefined) return []
        return ["folder " + folder]
    })
    return <div>TODO</div>
    return (
        <OkCancelLayout
            cancel={close}
            ok={() => {
                if (selection.length === 0) {
                    save("0")
                    return
                }
                const [, value] = selection[0].split(" ", 2)
                save(value)
            }}
        >
            <TreeComponentRenderer
                treeIndex={treeIndex}
                selection={selection}
                setSelection={setSelection}
                skipFolder={skipFolder}
                match={match}
                folderSelect
            />
        </OkCancelLayout>
    )
}

function FolderInput({ folder, treeIndex, setFolder, skipFolder, match }) {
    const FolderSelectorModal = useModalWindow()
    const folderIndex = treeIndex.folderIndex
    const openSelector = () => {
        FolderSelectorModal.open({
            treeIndex,
            folder,
            match,
            skipFolder,
            save: (index) => {
                setFolder(index)
                FolderSelectorModal.close()
            }
        })
    }
    let currPath = folderIndex.getFolderPathNames(folder).join("/")
    if (currPath !== "") {
        currPath += "/"
    }
    currPath = "/" + currPath

    const buttons = [
        {icon: "edit", onPressed: openSelector},
        {icon: "delete", onPressed: () => setFolder(ROOT_FOLDER_ID)}
    ]
    return (
        <>
            <div className="stack-h gap-x-d2x items-start">
                <Div
                    className="text-input-text bg-input-bg border-input-border border px-d2x py-d2y"
                    width="200px"
                >
                    <div className="stack-v overflow-hidden">
                        <div className="text-xs opacity-50 truncate">
                            {currPath}
                        </div>
                        <div className="text-sm">
                            {folderIndex.getFolderName(folder) ?? " "}
                        </div>
                    </div>
                </Div>
                <ButtonGroup buttons={buttons} />
            </div>

            <FolderSelectorModal.content>
                <FolderSelector {...FolderSelectorModal.props} />
            </FolderSelectorModal.content>
        </>
    )
}

function FolderForm({ model, save, close, treeIndex, match }) {
    const [name, setName] = useState(model.name)
    const [parent, setParent] = useState(model.parent ?? "0")

    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() => save({ ...model, name, parent })}
        >
            <FormGrid>
                <CustomCells name="Parent:">
                    <FolderInput
                        folder={parent}
                        skipFolder={model.value}
                        setFolder={setParent}
                        treeIndex={treeIndex}
                        match={match}
                    />
                </CustomCells>
                <InputCells
                    name="Name:"
                    required
                    value={name}
                    set={setName}
                    autoFocus={true}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function FileForm({ model, save, close, treeIndex, match }) {
    const [name, setName] = useState(model.name)
    const [folder, setFolder] = useState(model.folder ?? "0")

    return (
        <OkCancelLayout
            submit
            cancel={close}
            ok={() => save({ ...model, name, folder })}
        >
            <FormGrid>
                <CustomCells name="Parent:">
                    <FolderInput
                        folder={folder}
                        setFolder={setFolder}
                        treeIndex={treeIndex}
                        match={match}
                    />
                </CustomCells>
                <InputCells
                    name="Name:"
                    required
                    value={name}
                    set={setName}
                    autoFocus={true}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

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

function ContainerNodeListInner({
     exts,
     treeView,
     viewParams,
     container,
     className,
     itemClassName,
     innerClassName,
     render = item => item.name,
     full,
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
    const { nodes } = treeView
    const { filter = '' } = viewParams
    const cls = new ClassNames("stack-v item-start", className)
    const innerCls = new ClassNames("full", innerClassName)
    innerCls.addIf(styled && padded, 'px-d2x py-d2y')

    const outerCls = new ClassNames(" auto full overflow-y-auto")
    let colItemsCls = ''
    if (styled && colored) {
        const colComp = getCols(cols)
        const colCompCls = `${colComp.bg} ${colComp.color}`

        if (colsInner === cols) {
            outerCls.add(colCompCls)
        } else {
            cls.add(colCompCls)
            const colInner = getCols(colsInner)
            innerCls.add(colInner.bg)
            innerCls.add(colInner.color)
        }
        const colItems = getCols(colsItems)
        colItemsCls = `${colItems.bg} ${colItems.color}`
    }
    outerCls.addIf(styled && bordered, "border")
    outerCls.addIf(styled && bordered && colored, "border-input-border")

    if (itemActions) {
        useFocusGroupsOnItemContainer({ container })
    } else if (exts.has('focus')) {
        useFocusOnItemContainer({ container, moveFocus: exts.api.focus.moveFocus })
    }

    cls.addIf(full, "full")
    cls.addIf(!wrap, "text-nowrap")

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

    for (const [index, node] of nodes.entries()) {
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
    const bgCls = new ClassNames("w-full stack-v")
    bgCls.addIf(elems.length, 'shadow-inner shadow-2xl')

    const bgBottomElems = []
    if (!elems.length) {
        bgCls.add('auto')
        bgBottomElems.push(
            <div key="e" className="full text-xs px-d2x py-d2y auto">
                {getEmptyMsg ? getEmptyMsg(exts.plugProps) : <Centered>No items available</Centered>}
            </div>
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
    }
    const topInfoElems = exts.bgTopElems
    if (topInfoElems.length) {
        elems.unshift(
            <div key={-1} className={bgCls.value}><InfoElems key="t" elems={topInfoElems} /></div>
        )
    }
    return (
        <div className={outerCls.value} tabIndex={-1}>
            <div className={innerCls.value}>
                <Div
                    className={cls.value}
                    {...container.attr.props}
                >
                    {elems}
                </Div>
            </div>
        </div>
    )
}


function ContainerNodeList({ exts, ...props }) {
    const itemActions = exts.has('itemActions') ? exts.api.itemActions.getButtons(exts.plugProps) : null
    if (itemActions) {
        /*
        if (!exts.has('focus')) {
            return <ContainerNodeListInner exts={exts} {...props} itemActions={itemActions} />
        }
         */
        return (
            <FocusRowCtx>
                <ContainerNodeListInner exts={exts} {...props} itemActions={itemActions} />
            </FocusRowCtx>
        )
    }
    return <ContainerNodeListInner exts={exts} {...props} itemActions={undefined} />
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

function TreeComponentRenderer({ tree, colsBar, isFilterVisible, className, ...props }) {

    const { exts, areaRef, header, footer, treeIndex, treeView, container, viewParams } = tree

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

    const cls = ClassNames("stack-v px-d2x py-d2y", className)
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
    if (treeView.nodes.length === 0 && !(cls.has('h-full') || cls.has('full'))) {
        // v-centering for empty message
        cls.addIf(!attr.hasStyle('height') && attr.hasStyle('minHeight'), 'full')
    }
    return (
        <>
            <Div ref={areaRef} className={cls.value} {...attr.props}>
                {headerElems.length > 0 && <div className={headerCls.value}>
                    {headerElems}
                </div>
                }

                {!isCompact && <ContainerNodeList
                    full
                    container={container}
                    treeView={treeView}
                    treeIndex={treeIndex}
                    viewParams={viewParams}
                    exts={exts}
                    getEmptyMsg={exts.getEmptyMsg}
                    { ...props }
                />}

                {footerElems.length > 0 && !isCompact && <div className={footerCls.value}>
                    {footerElems}
                </div>
                }
            </Div>
            {exts && exts.modals}
        </>
    )
}

export { FolderInput, FileForm, FolderForm, TreeComponentRenderer }
