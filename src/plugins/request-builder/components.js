import { useEffect, useMemo, useContext, useRef } from "react"
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
import {
    KeyValueEditor,
    HighlightKeys,
    JsonTextarea,
    EntityPicker,
    useUpdateOnEntityIndexChanges
} from "components/common"
import { useState } from "react"
import { isValidJson, cloneDeep, d } from "core/helper"
import { PathInput } from "./path-input"
import { headerContentTypes, requestHeaderOptions } from "./helper"
import { OkCancelLayout, Tab, Tabs } from "components/layout"
import { AssignmentIndex, AssignmentStack } from "entities/assignments"
import { AppContext } from "components/context"
import { SaveRequestForm } from "entities/requests"
import { extractLcProps } from "core/entity"
import { ClassNames } from "core/helper"
import { RequestAssingmentsPickerCells } from "entities/request-assignments"
import { APIS, ApiSelect } from "entities/apis"
import { SimpleRoutePath } from "entities/routes"

const emptyValue = "<Enter Value>"

const httpMethodOptions = [
    { id: "POST", name: "POST" },
    { id: "GET", name: "GET" },
    { id: "OPTIONS", name: "OPTIONS" },
    { id: "PATCH", name: "PATH" },
    { id: "DELETE", name: "DELETE" },
    { id: "PUT", name: "PUT" },
    { id: "HEAD", name: "HEAD" }
]

function getDefaultlessClone(model) {
    if (!model) return model

    const obj = {}
    for (const [key, value] of Object.entries(model)) {
        if (value.type === "default") continue

        obj[key] = cloneDeep(value)
    }
    return obj
}

function RequestBuilder({ close, request, assignments }) {
    const aContext = useContext(AppContext)
    const SaveAsModal = useModalWindow()
    useUpdateOnEntityIndexChanges(aContext.defaultsIndex)

    const [active, setActive] = useState("")
    const [api, setApi] = useState(request?.api ?? APIS.OPTION.CURRENT)
    const [method, setMethod] = useState(request?.method ?? "GET")
    const [path, setPath] = useState(request?.path ?? "/")
    const [body, setBody] = useState(request?.body ?? "")
    const [defaults, setDefaults] = useState(
        request?.defaults ?? aContext.apiSettings.preselectedDefaults
    )
    const [showDefaults, setShowDefaultsRaw] = useState(
        aContext.apiSettings.showDefaults
    )
    const setShowDefaults = (value) => {
        aContext.setApiSetting("showDefaults", value)
        setShowDefaultsRaw(value)
    }
    const queryAssignmentIndex = useMemo(
        () => new AssignmentIndex(assignments?.query ?? {}),
        []
    )
    const headersAssignmentIndex = useMemo(
        () => new AssignmentIndex(assignments?.headers ?? {}),
        []
    )
    const bodyAssignmentIndex = useMemo(
        () => new AssignmentIndex(assignments?.body ?? {}),
        []
    )
    const defaultsModel = useMemo(() => {
        return aContext.getDefaults(defaults)
    }, [defaults, aContext.defaultsIndex.lastModified, active])

    useEffect(() => {
        const { query, headers, body } = defaultsModel
        queryAssignmentIndex.syncToDefaults(query)
        headersAssignmentIndex.syncToDefaults(headers)
        bodyAssignmentIndex.syncToDefaults(body)
    }, [defaultsModel])

    const hasBody = isMethodWithRequestBody(method)

    const startRequest = () => {
        const request = {
            api,
            method,
            defaults,
            path,
            body
        }
        const assignments = {
            query: getDefaultlessClone(queryAssignmentIndex.model),
            headers: getDefaultlessClone(headersAssignmentIndex.model),
            body: hasBody
                ? getDefaultlessClone(bodyAssignmentIndex.model)
                : undefined
        }
        aContext.startContentStream(request, assignments)
        close()
    }

    const load = (model) => {
        const { request, assignments } = model
        setActive(model.value ?? "")
        setApi(request.api)
        setMethod(request.method)
        setPath(request.path)
        setBody(request.body)
        queryAssignmentIndex.setModel(assignments.query)
        headersAssignmentIndex.setModel(assignments.headers)
        bodyAssignmentIndex.setModel(assignments.body)
        setDefaults(request.defaults)
        aContext.defaultsIndex.notify()
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
        defaults,
        setDefaults,
        defaultsModel,
        showDefaults,
        setShowDefaults,
        queryAssignmentIndex,
        headersAssignmentIndex,
        bodyAssignmentIndex
    }

    const buttons = [
        {
            name: "New",
            onPressed: () => {
                setActive("")
                setMethod("GET")
                setPath("/")
                setBody("")
                setDefaults(aContext.apiSettings.preselectedDefaults)
                queryAssignmentIndex.setModel({})
                headersAssignmentIndex.setModel({})
                bodyAssignmentIndex.setModel({})
                aContext.defaultsIndex.notify()
            }
        },
        {
            name: "Save",
            disabled: active === "",
            onPressed: () => {
                const requestIndex = aContext.requestIndex
                const index = requestIndex.getEntityByPropValue("value", active)
                const model = requestIndex.getEntityObject(index)
                requestIndex.setEntityObject(
                    {
                        ...model,
                        request: cloneDeep({
                            api,
                            defaults,
                            method,
                            path,
                            body
                        }),
                        assignments: {
                            query: getDefaultlessClone(
                                queryAssignmentIndex.model
                            ),
                            headers: getDefaultlessClone(
                                headersAssignmentIndex.model
                            ),
                            body: isMethodWithRequestBody(method)
                                ? getDefaultlessClone(bodyAssignmentIndex.model)
                                : undefined
                        }
                    },
                    true
                )
            }
        },
        {
            name: "Save As...",
            onPressed: () => {
                SaveAsModal.open({
                    model: { name: "" },
                    reserved: extractLcProps(aContext.requestIndex, "name"),
                    save: ({ name }) => {
                        const value = crypto.randomUUID()
                        aContext.requestIndex.setEntityObject({
                            value,
                            name,
                            request: {
                                api,
                                defaults,
                                method,
                                path,
                                body
                            },
                            assignments: {
                                query: getDefaultlessClone(
                                    queryAssignmentIndex.model
                                ),
                                headers: getDefaultlessClone(
                                    headersAssignmentIndex.model
                                ),
                                body: isMethodWithRequestBody(method)
                                    ? getDefaultlessClone(
                                          bodyAssignmentIndex.model
                                      )
                                    : undefined
                            }
                        })
                        setActive(value)
                        SaveAsModal.close()
                    }
                })
            }
        }
    ]
    const requestCls = ClassNames("px-2 auto")
    requestCls.addIf(
        active !== "",
        "bg-active-bg text-active-text py-1 border border-header-border text-xs",
        "opacity-50 text-sm"
    )
    return (
        <OkCancelLayout scroll={false} cancel={close} ok={startRequest}>
            <>
                <div className="w-full h-full divide-x divide-header-border stack-h overflow-hidden">
                    <div className="stack-v h-full overflow-hidden">
                        <div className="stack-h gap-2 p-2">
                            <ApiSelect
                                api={api}
                                setApi={setApi}
                                apiIndex={aContext.apiIndex}
                                apiEnvIndex={aContext.apiEnvIndex}
                            />
                        </div>

                        <Tabs className="overflow-hidden">
                            <Tab name="Stored" active>
                                <div className="p-2 h-full">
                                    <EntityPicker
                                        className="h-full"
                                        entityIndex={aContext.requestIndex}
                                        pick={load}
                                        matcher={(idx) =>
                                            aContext.requestIndex.getEntityPropValue(
                                                idx,
                                                "request"
                                            ).api === api
                                        }
                                        render={({ name, request }) => (
                                            <div className="stack-v">
                                                <div className="text-sm">
                                                    {name}
                                                </div>
                                                <div className="text-xs opacity-50">
                                                    {request.method}{" "}
                                                    {request.path}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                            </Tab>
                            <Tab name="History">
                                <div className="p-2 h-full">
                                    <EntityPicker
                                        className="h-full"
                                        pick={load}
                                        entityIndex={aContext.requestIndex}
                                        matcher={(idx) =>
                                            aContext.requestIndex.getEntityPropValue(
                                                idx,
                                                "request"
                                            ).api === api
                                        }
                                        render={({ request }) => (
                                            <div className="stack-v">
                                                <div className="text-xs opacity-50">
                                                    {request.method}{" "}
                                                    {request.path}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                            </Tab>
                            <Tab name="Routes">
                                <div className="p-2 h-full">
                                    <EntityPicker
                                        className="h-full"
                                        pick={({ path, methods, api }) => {
                                            load({
                                                request: {
                                                    api,
                                                    path,
                                                    defaults:
                                                        aContext.apiSettings
                                                            .preselectedDefaults,
                                                    method: methods[0],
                                                    body: ""
                                                },
                                                assignments: {}
                                            })
                                        }}
                                        entityIndex={aContext.routeIndex}
                                        matcher={(idx) =>
                                            aContext.routeIndex.getEntityPropValue(
                                                idx,
                                                "api"
                                            ) === api
                                        }
                                        render={({ path, methods }) => (
                                            <div className="stack-v text-xs">
                                                <SimpleRoutePath path={path} />
                                                <div className="opacity-50">
                                                    {methods.join(", ")}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                            </Tab>
                        </Tabs>
                    </div>

                    <div className="stack-v auto h-full">
                        <div className="px-2 pt-2 w-full">
                            <div className="stack-h items-center w-full gap-2 bg-header-bg/25 p-1 border border-header-border/50">
                                <div className={requestCls.value}>
                                    {active === ""
                                        ? "New Request..."
                                        : aContext.getRequestName(active)}
                                </div>
                                <ButtonGroup buttons={buttons} />
                            </div>
                        </div>

                        <div className="stack-v auto h-full overflow-hidden">
                            <div className="overflow-y-auto auto">
                                <RequestLauncher {...launcherParams} />
                            </div>
                        </div>
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
    method,
    setMethod,
    path,
    setPath,
    body,
    setBody,
    defaults,
    setDefaults,
    showDefaults,
    setShowDefaults,
    defaultsModel = {},
    queryAssignmentIndex,
    headersAssignmentIndex,
    bodyAssignmentIndex
}) => {
    const aContext = useContext(AppContext)
    const hasBody = isMethodWithRequestBody(method)
    const getMatcher = (entityIndex) => {
        if (showDefaults) return

        return (index) =>
            entityIndex.getEntityPropValue(index, "type") !== "default"
    }

    return (
        <div className="auto overflow-hidden">
            <FormGrid>
                <SelectCells
                    name="Method:"
                    options={httpMethodOptions}
                    value={method}
                    set={setMethod}
                />
                <InputCells
                    name="Path:"
                    value={path}
                    set={setPath}
                    className="w-full"
                />
                <RequestAssingmentsPickerCells
                    name="Defaults:"
                    requestAssignmentsIndex={aContext.defaultsIndex}
                    value={defaults}
                    set={setDefaults}
                    visibility={showDefaults}
                    setVisibility={setShowDefaults}
                />
                <CustomCells name="Query:">
                    <AssignmentStack
                        assignmentIndex={queryAssignmentIndex}
                        defaultsModel={defaultsModel.query}
                        matcher={getMatcher(queryAssignmentIndex)}
                    />
                </CustomCells>
                <CustomCells name="Headers:">
                    <AssignmentStack
                        assignmentIndex={headersAssignmentIndex}
                        defaultsModel={defaultsModel.headers}
                        matcher={getMatcher(headersAssignmentIndex)}
                    />
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
                                defaultsModel={defaultsModel.body}
                                matcher={getMatcher(bodyAssignmentIndex)}
                            />
                        </div>
                    </CustomCells>
                )}
            </FormGrid>
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
        plugin.setOpenEditor(RequestBuilderModal.open)
    }, [])

    return (
        <RequestBuilderModal.content
            name="Request Builder"
            width="900px"
            height="500px"
        >
            <RequestBuilder {...RequestBuilderModal.props} />
        </RequestBuilderModal.content>
    )
}

export { RequestBuilderWindow }
