import { EXT_TYPE } from "core/extension"
import { useUnrenderedExtComponent } from "../components/ext-components.js"
import { ExtStackRenderer as ExtTreeRenderer } from "./stack.js"

function useUnrenderedTreeComponent({ entityIndex, ...props }) {
    // TODO check!
    // if (!(entityIndex.prototype instanceof TreeIndex)) throw Error(`EntityIndex must be a sub class of TreeIndex`)

    return useUnrenderedExtComponent(EXT_TYPE.TREE, {
        entityIndex,
        ...props,
        viewPreProps: [
            (node) => {
                const { id } = node
                const level = entityIndex.getEntityLevel(id)
                node.viewLevel = level
                node.level = level
                node.parent = entityIndex.getParent(id)
                node.ancestors = entityIndex.getAncestors(id)
                node.ancestorNames = entityIndex.getAncestorNames(id)
                node.isContainer = entityIndex.canHaveChildren(id)
            }
        ]
    })
}

function useTreeComponent({ entityIndex, match, skip, extensions, header, footer, ...props }) {
    const tree = useUnrenderedTreeComponent({ entityIndex, match, skip, extensions, header, footer })
    return <ExtTreeRenderer list={tree} { ...props } />
}

export {
    ExtTreeRenderer,
    useTreeComponent,
    useUnrenderedTreeComponent,
}