import { Section } from "./common.js"
import { ClassNames } from "../core/helper.js"

function LayoutTest({ style, empty = false }) {
    const cls = ClassNames("stack-v full" + " gap-y-d1y")
    const stackCls = ClassNames("overflow-y-auto" + " border border-input-border bg-input-bg text-input-text")
    const paddingCls = ClassNames("stack-v auto min-h-full" + " px-d2x py-d2y")
    const itemsCls = ClassNames("stack-v auto" + " bg-header-bg/25")
    const itemCls = ClassNames("bg-input-bg px-d2x py-d2y focus-fix focus:outline-none focus:ring focus:ring-focus-border [&:not(:first-child)]:mt-[2px]")
    return (
        <div className={cls.value}>
            <div className="border border-input-border">Hello</div>

            <div
                className={stackCls.value}
                style={style}
            >
                <div className={paddingCls.value}>
                    {!empty &&
                        <div className={itemsCls.value}>
                            <div className="px-d2x">Top!</div>
                            <div tabIndex="0" className={itemCls.value}>Hello 1</div>
                            <div tabIndex="0" className={itemCls.value}>Hello 2</div>
                            <div tabIndex="0" className={itemCls.value}>Hello 3</div>
                            <div tabIndex="0" className={itemCls.value}>Hello 4</div>
                            <div tabIndex="0" className={itemCls.value}>Hello 5</div>
                            <div tabIndex="0" className={itemCls.value}>Hello 6</div>
                            <div tabIndex="0" className={itemCls.value}>Hello 7</div>
                            <div className="px-d2x">Bottom!</div>
                            <div className="auto stack-v"></div>
                        </div>
                    }
                    {empty &&
                        <div className={itemsCls.value}>
                            <div className="auto stack-v">
                                <div className="auto grid place-items-center">
                                    <div className="text-xl opacity-50">Empty Message!</div>
                                </div>
                            </div>
                        </div>
                    }
                </div>

            </div>

            <div className="border border-input-border">Hello</div>
        </div>
    )
}



function StackLayoutsContent() {
    return (
        <Section
            name="Stack Layouts"
             samples={[
                 {
                     name: 'No height',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <LayoutTest style={{}} />
                 },
                 {
                     name: 'Small height with scrollbar',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <LayoutTest style={{height: '150px'}} />,
                 },
                 {
                     name: 'Small max-height with scrollbar',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <LayoutTest style={{maxHeight: '150px'}} />,
                 },
                 {
                     name: 'Big height without scrollbar',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <LayoutTest style={{height: '350px'}} />,
                 },
                 {
                     name: 'Big max-height without scrollbar',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <LayoutTest style={{maxHeight: '350px'}} />,
                 },
                 {
                     name: 'Full-height without scrollbar',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <div style={{height: "500px"}}><LayoutTest style={{height: '100%'}} /></div>,
                 },
                 {
                     name: 'Empty with no height',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <LayoutTest style={{height: '100%'}} empty />,
                 },
                 {
                     name: 'Empty with height',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <LayoutTest style={{height: '250px'}} empty />,
                 },
                 {
                     name: 'Empty with min-height',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <LayoutTest style={{minHeight: '250px'}} empty />,
                 },
                 {
                     name: 'Full-height',
                     code: 'useStackComponent({\n' +
                         '  entityIndex: myEntityIndex\n' +
                         '})',
                     elem: <div style={{height: "500px"}}><LayoutTest style={{height: '100%'}} empty /></div>,
                 },
             ]}
        />
    )
}

export { StackLayoutsContent }