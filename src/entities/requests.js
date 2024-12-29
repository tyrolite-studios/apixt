import { useState } from "react"
import { MappingIndex } from "core/entity"
import { EntityStack, EntityList } from "components/common"
import { useModalWindow } from "components/modal"
import { extractLcProps } from "core/entity"
import { OkCancelLayout } from "components/layout"
import { FormGrid, InputCells } from "components/form"

class RequestIndex extends MappingIndex {
    constructor(model) {
        super(model, ["name", "folder", "request", "assignments"])
        this.filterProps = ["name"]
    }
}

function SaveRequestForm({ close, model, edit, save, reserved }) {
    const [name, setName] = useState(model.name)
    return (
        <OkCancelLayout submit ok={() => save({ name })} cancel={close}>
            <FormGrid>
                <InputCells
                    name="Name"
                    required
                    autoFocus
                    isValid={(name) => !reserved.includes(name.toLowerCase())}
                    value={name}
                    set={setName}
                />
            </FormGrid>
        </OkCancelLayout>
    )
}

function RequestPicker({ requestIndex, pick }) {
    const [selected, setSelected] = useState([])
    return (
        <EntityList
            entityIndex={requestIndex}
            pick={(x) => d("PICK", x)}
            selected={selected}
            setSelected={() => {}}
            render={({ name, request }) => (
                <div>
                    <div className="size-sm">{name}</div>
                    <div className="size-xs opacity-50">
                        {request.method} {request.path}
                    </div>
                </div>
            )}
        />
    )
}

function RequestStack({ requestIndex, load }) {
    const RequestFormModal = useModalWindow()

    const actions = [
        {
            action: "delete",
            op: {
                exec: (selected, setSelected) => {
                    requestIndex.deleteEntities(selected)
                    setSelected([])
                },
                can: (selected) => selected.length > 0
            }
        }
    ]
    const itemActions = [
        {
            icon: "east",
            action: (index) => {
                const model = requestIndex.getEntityObject(index)
                load(model)
            }
        },
        {
            icon: "edit",
            action: (index) => {
                const model = requestIndex.getEntityObject(index)
                RequestFormModal.open({
                    edit: true,
                    reserved: extractLcProps(requestIndex, "name", model),
                    model,
                    save: (newModel) => {
                        requestIndex.setEntityObject(
                            { ...model, ...newModel },
                            true
                        )
                        RequestFormModal.close()
                    }
                })
            }
        },
        {
            icon: "delete",
            action: (index) => requestIndex.deleteEntity(index)
        }
    ]

    return (
        <>
            <EntityStack
                entityIndex={requestIndex}
                actions={actions}
                itemActions={itemActions}
                render={({ name, request }) => (
                    <div className="stack-v">
                        <div>{name}</div>
                        <div className="opacity-50 text-xs">
                            {request.method} {request.path}
                        </div>
                    </div>
                )}
            />

            <RequestFormModal.content>
                <SaveRequestForm {...RequestFormModal.props} />
            </RequestFormModal.content>
        </>
    )
}

export { RequestIndex, RequestStack, RequestPicker, SaveRequestForm }
