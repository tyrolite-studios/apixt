import { useExtractDimProps } from "../components/common.js"
import { ClassNames } from "../core/helper.js"

function Sample({ name, code, children }) {
    return (
        <>
            <div className="text-xs col-span-2 border-t pt-2 mt-1">{name}:</div>
            <div>{children}</div>
            <div>
                <pre className="border break-all text-wrap text-block-text/70 bg-block-bg border-block-border text-sm px-2">
                    {code}
                </pre>
            </div>
        </>
    )
}

function Section({ name, samples }) {
    const elems = []
    for (const { name, code, elem, info } of samples) {
        if (info) {
            elems.push(
                <div key="info" className="pt-2  border-t col-span-2">
                    <div className="text-sm bg-warning-bg text-warning-text p-2">
                        {info}
                    </div>
                </div>
            )
        } else {
            elems.push(
                <Sample key={name} name={name} code={code} children={elem} />
            )
        }
    }

    return (
        <div className="stack-v p-2">
            <div className="bg-header-bg text-header-text px-2">{name}</div>
            <div className="p-2 grid grid-cols-2 gap-2">{elems}</div>
        </div>
    )
}

function DashedRect({
                        resize = false,
                        resizeX = false,
                        resizeY = false,
                        children,
                        ...props
                    }) {
    const style = useExtractDimProps(props)
    const cls = new ClassNames("border-4 border-dashed border-app-text/30")
    cls.addIf(resize, "resize")
    cls.addIf(resizeX, "resize-x")
    cls.addIf(resizeY, "resize-y")

    return (
        <div style={style} className={cls.value}>
            {children}
        </div>
    )
}

export {
    Sample,
    Section,
    DashedRect
}