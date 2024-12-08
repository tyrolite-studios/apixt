import { useEffect, useMemo, useContext } from "react"
import { useModalWindow } from "components/modal"
import { isMethodWithRequestBody } from "core/http"
import {
    Select,
    Button,
    ButtonGroup,
    Input,
    Textarea,
    FormGrid,
    SelectCells,
    InputCells,
    CustomCells
} from "components/form"
import { KeyValueEditor, HighlightKeys, JsonTextarea } from "components/common"
import { useState } from "react"
import { isValidJson, cloneDeep, d } from "core/helper"
import { PathInput } from "./path-input"
import { headerContentTypes, requestHeaderOptions } from "./helper"
import { OkCancelLayout, Tab, Tabs } from "components/layout"
import { AssignmentIndex, AssignmentStack } from "entities/assignments"
import { AppContext } from "components/context"
import { ApiManagerWindow } from "entities/apis"
import { RequestStack, SaveRequestForm, RequestPicker } from "entities/requests"
import { extractLcProps } from "core/entity"

const emptyValue = "<Enter Value>"

const httpMethodOptions = [
    { id: "POST", name: "POST" },
    { id: "GET", name: "GET" },
    { id: "DELETE", name: "DELETE" },
    { id: "PUT", name: "PUT" },
    { id: "HEAD", name: "HEAD" }
]

function RequestBuilder({ close }) {
    const aContext = useContext(AppContext)
    const SaveAsModal = useModalWindow()

    const [active, setActive] = useState("")
    const [api, setApi] = useState("0")
    const [method, setMethod] = useState("POST")
    const [path, setPath] = useState("")
    const [body, setBody] = useState("")
    const queryAssignmentIndex = useMemo(() => new AssignmentIndex({}), [])
    const headersAssignmentIndex = useMemo(() => new AssignmentIndex({}), [])
    const bodyAssignmentIndex = useMemo(() => new AssignmentIndex({}), [])

    const hasBody = isMethodWithRequestBody(method)

    const startRequest = () => {
        const request = {
            method,
            path,
            body,
            api: api !== "0" ? api : undefined
        }
        const assignments = {
            query: queryAssignmentIndex.model,
            headers: headersAssignmentIndex.model,
            body: hasBody ? bodyAssignmentIndex.model : undefined
        }
        if (request.api) {
            aContext.fetchApiResponse(request, assignments)
        } else {
            aContext.startContentStream(request, assignments)
        }
        close()
    }

    const load = (model) => {
        const { request, assignments } = model
        setActive(model.value)
        setApi(model.api)
        setMethod(request.method)
        setPath(request.path)
        setBody(request.body)
        queryAssignmentIndex.setModel(assignments.query)
        headersAssignmentIndex.setModel(assignments.headers)
        bodyAssignmentIndex.setModel(assignments.body)
    }

    const launcherParams = {
        api,
        setApi,
        method,
        setMethod,
        path,
        setPath,
        body,
        setBody,
        queryAssignmentIndex,
        headersAssignmentIndex,
        bodyAssignmentIndex
    }

    const buttons = [
        {
            name: "New",
            onPressed: () => {
                setActive("")
                setApi("0")
                setMethod("POST")
                setPath("/")
                setBody("")
                queryAssignmentIndex.setModel({})
                headersAssignmentIndex.setModel({})
                bodyAssignmentIndex.setModel({})
            }
        },
        {
            name: "Save",
            disabled: active === "",
            onPressed: () => d("Save")
        },
        {
            name: "Save As...",
            onPressed: () => {
                SaveAsModal.open({
                    model: { name: "" },
                    reserved: extractLcProps(aContext.requestIndex, "name"),
                    save: ({ name }) => {
                        aContext.requestIndex.setEntityObject({
                            value: crypto.randomUUID(),
                            name,
                            api,
                            request: {
                                method,
                                path,
                                body
                            },
                            assignments: {
                                query: cloneDeep(queryAssignmentIndex.model),
                                headers: cloneDeep(
                                    headersAssignmentIndex.model
                                ),
                                body: cloneDeep(bodyAssignmentIndex.model)
                            }
                        })
                        SaveAsModal.close()
                    }
                })
            }
        }
    ]
    return (
        <OkCancelLayout scroll={false} cancel={close} ok={startRequest}>
            <>
                <div className="stack-h w-full h-full divide-x divide-header-border">
                    <div className="h-full stack-v divide-y divide-header-border">
                        <div className="stack-v p-2 gap-2">
                            <ButtonGroup buttons={buttons} />
                            <div>
                                {active === ""
                                    ? "New Request"
                                    : aContext.getRequestName(active)}
                            </div>
                        </div>
                        <Tabs>
                            <Tab name="Stored" active>
                                <div className="p-2 h-full">
                                    <RequestStack
                                        className="h-full"
                                        requestIndex={aContext.requestIndex}
                                        load={load}
                                    />
                                </div>
                            </Tab>
                            <Tab name="History">
                                <div className="p-2 h-full">
                                    <RequestPicker
                                        pick={load}
                                        requestIndex={aContext.requestIndex}
                                    />
                                </div>
                            </Tab>
                        </Tabs>
                    </div>
                    <div className="overflow-y-auto auto">
                        <RequestLauncher {...launcherParams} />
                    </div>
                </div>

                <SaveAsModal.content>
                    <SaveRequestForm {...SaveAsModal.props} />
                </SaveAsModal.content>
            </>
        </OkCancelLayout>
    )
}

const RequestLauncher = ({
    api,
    setApi,
    method,
    setMethod,
    path,
    setPath,
    body,
    setBody,
    queryAssignmentIndex,
    headersAssignmentIndex,
    bodyAssignmentIndex
}) => {
    const aContext = useContext(AppContext)
    const ApiManagerModal = useModalWindow()
    const hasBody = isMethodWithRequestBody(method)
    return (
        <div className="auto">
            <FormGrid>
                <CustomCells name="API">
                    <div className="stack-h gap-2">
                        <Select
                            options={aContext.getApiOptions()}
                            value={api}
                            set={setApi}
                        />
                        <Button
                            icon="build"
                            onPressed={() =>
                                ApiManagerModal.open({
                                    apiIndex: aContext.apiIndex,
                                    apiEnvIndex: aContext.apiEnvIndex
                                })
                            }
                        />
                    </div>
                </CustomCells>
                <SelectCells
                    name="Method"
                    options={httpMethodOptions}
                    value={method}
                    set={setMethod}
                />
                <InputCells name="Path" value={path} set={setPath} />
                <CustomCells name="Query:">
                    <AssignmentStack assignmentIndex={queryAssignmentIndex} />
                </CustomCells>
                <CustomCells name="Headers:">
                    <AssignmentStack assignmentIndex={headersAssignmentIndex} />
                </CustomCells>
                {hasBody && (
                    <CustomCells name="Body:">
                        <div className="stack-v">
                            <Textarea value={body} set={setBody} />
                            <div className="text-xs py-2">
                                Auto-Assignments:
                            </div>
                            <AssignmentStack
                                assignmentIndex={bodyAssignmentIndex}
                            />
                        </div>
                    </CustomCells>
                )}
            </FormGrid>

            <ApiManagerModal.content>
                <ApiManagerWindow {...ApiManagerModal.props} />
            </ApiManagerModal.content>
        </div>
    )
}

const RequestBuilder2 = ({ close }) => {
    const [method, setMethodRaw] = useState("POST")
    const [path, setPath] = useState("")
    const [headers, setHeaders] = useState({
        values: {
            "Content-Type": {
                value: "application/json",
                type: "string",
                suggestions: headerContentTypes
            },
            "Content-Length": {
                value: 50,
                type: "number",
                min: 0
            },
            "X-mx-Header": {
                value: "blabla",
                type: "string"
            }
        },
        suggestions: Object.keys(requestHeaderOptions)
    })
    const [body, setBody] = useState("")
    const [bodyValue, setBodyValue] = useState("")
    const [bodyDisabled, setBodyDisabled] = useState(false)
    const [isJson, setIsJson] = useState(true)
    const [jsonIsValid, setJsonIsValid] = useState(false)
    const [headersVisible, setHeadersVisible] = useState(false)

    const setMethod = (selectedMethod) => {
        setMethodRaw(selectedMethod)
        enableOptions(selectedMethod)
    }

    const removeCurrentOptions = () => {
        setBodyDisabled(true)
        //...
    }

    const enableOptions = (selectedMethod) => {
        removeCurrentOptions()
        if (selectedMethod === "POST") {
            setBodyDisabled(false)
        }
        //...
    }

    const handleSubmit = () => {
        const emptyHeaders = Object.keys(headers.values).filter(
            (header) => headers.values[header] === emptyValue
        )
        for (const header of emptyHeaders) {
            delete headers.values[header]
        }

        const requestParams = {
            method,
            headers: headers.values,
            body
        }
        console.log("Submitting request:", requestParams)
        if (!method || !path || Object.keys(headers).length === 0) {
            console.error(
                "missing " + (!method ? "method" : !path ? "path" : "headers")
            )
        } else {
            //URL NOCH RICHTIG MACHEN
            const request = new Request("/" + path, requestParams)
            fetch(request)
                .then((response) => {
                    if (response.status === 200) {
                        console.log("success")
                    } else {
                        throw new Error("Something went wrong on API server!")
                    }
                })
                .catch((error) => {
                    console.error(error)
                })
        }
    }

    return (
        <OkCancelLayout
            cancel={close}
            ok={() => d("SUBMIT", { method, headers, body })}
        >
            <div className="h-full p-4 flex flex-col gap-y-4">
                <div className="stack-h w-full text-white flex flex-row justify-normal items-center gap-4 text-sm">
                    {/* Method selection */}
                    <Select
                        options={httpMethodOptions}
                        value={method}
                        set={setMethod}
                    />
                    {/* Path */}
                    <div className="auto stack-h items-center gap-2">
                        <div className="text-app-text">Path: </div>
                        <Input
                            value={path}
                            set={setPath}
                            autoFocus
                            className="auto"
                        />
                        {/* <PathInput sendPathToParent={handlePathChange} /> */}
                    </div>
                </div>
                {/* Header */}
                <div>
                    <div className="text-app-text flex justify-between items-center">
                        <span>Header</span>
                        <button
                            className="text-sm text-white p-1"
                            onClick={() => setHeadersVisible(!headersVisible)}
                        >
                            {headersVisible ? "Hide" : "Show"}
                        </button>
                    </div>
                    {headersVisible ? (
                        <KeyValueEditor
                            object={headers}
                            sendObjectToParent={(newHeaders) =>
                                setHeaders(newHeaders)
                            }
                        />
                    ) : (
                        <div className="text-white bg-gray-700 p-2 rounded text-sm text-left">
                            <span className="truncate block overflow-hidden whitespace-nowrap">
                                <HighlightKeys obj={headers.values} />
                            </span>
                        </div>
                    )}
                </div>
                {/* Body */}
                {!bodyDisabled ? (
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                            <div className="flex">
                                <ButtonGroup
                                    gapped={false}
                                    buttons={[
                                        {
                                            name: "JSON",
                                            activated: true,
                                            value: isJson,
                                            className:
                                                "not_py-0 not_px-2 py-2 px-4",
                                            onPressed: () => {
                                                isJson ? null : setIsJson(true)
                                                setJsonIsValid(
                                                    isValidJson(bodyValue)
                                                )
                                                setBody(bodyValue)
                                            }
                                        },
                                        {
                                            name: "Raw",
                                            activated: false,
                                            value: isJson,
                                            className:
                                                "not_py-0 not_px-2 py-2 px-4",
                                            onPressed: () => {
                                                !isJson
                                                    ? null
                                                    : setIsJson(false)
                                                setBody(bodyValue)
                                            }
                                        }
                                    ]}
                                />
                            </div>
                            {isJson ? (
                                <div className="text-sm p-1">
                                    {jsonIsValid || body === "" ? (
                                        <div className="text-green-700">
                                            Valid Body
                                        </div>
                                    ) : (
                                        <div className="text-red-700">
                                            Invalid Body
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                        <div>
                            {isJson ? (
                                <JsonTextarea
                                    sendJsonValidityToParent={(valid) =>
                                        setJsonIsValid(valid)
                                    }
                                    sendTextareaValueToParent={(val) => {
                                        setBody(val)
                                        setBodyValue(val)
                                    }}
                                    value={bodyValue}
                                />
                            ) : (
                                <textarea
                                    className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                    placeholder="Enter text"
                                    onChange={(e) => {
                                        setBody(e.target.value)
                                        setBodyValue(e.target.value)
                                    }}
                                    value={bodyValue}
                                />
                            )}
                        </div>
                    </div>
                ) : null}
                {/* Submit button */}
                {method &&
                path &&
                Object.keys(headers.values).length !== 0 &&
                (method === "post" && isJson
                    ? jsonIsValid || body === ""
                    : true) ? (
                    <Button
                        onPressed={handleSubmit}
                        mode="active"
                        label="Submit"
                    />
                ) : null}
            </div>
        </OkCancelLayout>
    )
}

function RequestBuilderWindow({ plugin }) {
    const RequestBuilderModal = useModalWindow()

    useEffect(() => {
        plugin.setButtonHandler("builder", () => {
            RequestBuilderModal.open({})
        })
    }, [])

    return (
        <RequestBuilderModal.content
            name="Query Builder"
            width="900px"
            height="500px"
        >
            <RequestBuilder {...RequestBuilderModal.props} />
        </RequestBuilderModal.content>
    )
}

export { RequestBuilderWindow }
