const Select = ({
    label,
    options,
    onSelect,
    disabled = false,
    className = ""
}) => {
    return (
        <div className="w-full mx-auto">
            <select
                id={label}
                className={className}
                disabled={disabled}
                onChange={(e) => onSelect(e.target.value)}
            >
                <option defaultValue>Select {label}</option>
                {options.map((option, index) => (
                    <option key={index} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    )
}

/*
    TODO 
    JSON Invalid bar (?)
    vllt Option für Liste rechts (?)
*/
const JsonTextarea = ({ placeholder, onInput, disabled = false }) => {
    const handleChange = (event) => {
        if (onInput) {
            onInput(event.target.value)
        }
    }

    return (
        <textarea
            placeholder={placeholder}
            rows="4"
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            disabled={disabled}
            onChange={handleChange}
        ></textarea>
    )
}

export { Select, JsonTextarea }
