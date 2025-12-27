import { useMemo } from "react"
import { Section } from "./common.js"
import { MappingIndex } from "../core/entity.js"
import { useTableComponent } from "../entities/table.js"

const testTableIndex = new MappingIndex({
    1: {name: 'whoa!'},
    2: {name: 'juash ahsash qs2'},
    3: {name: 'akshay suxce'},
}, ['name'])

function TableComponent() {
    return <div>
        <MyGrid entityIndex={testTableIndex} />
    </div>
}

function MyGrid({ entityIndex }) {
    const render = ({ entity }) => [
        <div className="text-right">{entity.index}</div>,
        <div>{entity.value}</div>,
        <div className="opacity-50">{entity.name}</div>
    ]
    const headerRender= () => [
        <div>Rank</div>,
        <div>Name</div>,
        <div>More</div>
    ]

    return useTableComponent({
        entityIndex,
        render,
        headerRender
    })
}


function TableContent() {
    return (
        <Section
            name="Entity Table"
            samples={[
                {
                    name: 'Table component',
                    code: '<TableComponent />',
                    elem: <TableComponent />,
                },
            ]}
        />
    )
}

export { TableContent }