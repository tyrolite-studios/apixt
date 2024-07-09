const Select = (props) => {
    return (
		<form className="max-w-sm mx-auto">
            <select id="{props.label}" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                <option defaultValue>Select {props.label}</option>
                {
                    props.options.map((option, index) => (
                        <option key={index} value={option.toLowerCase()}>
                            {option}
                        </option>
                    ))
                }
            </select>
        </form>
    );
};

/*
    TODO 
    JSON Invalid bar (?)
    vllt Option für Liste rechts (?)
*/
const JsonTextarea = (props) => {
    return (
		<textarea placeholder={props.placeholder} rows="4" className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"></textarea>
    );
}

export { Select, JsonTextarea };