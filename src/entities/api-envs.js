import { MappingIndex } from "core/entity"

class ApiEnvIndex extends MappingIndex {
    constructor(model) {
        super(model, ["url", "name", "cors", "envVars"])
    }
}

export { ApiEnvIndex }
