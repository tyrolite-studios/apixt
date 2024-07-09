import { Select, JsonTextarea } from "../commons";

/*
	TODO
	Die JsonTextarea's verbinden mit der Funktionialität
		=> Json validate + Format
	Bei nem Submit die infos rausholen
	Path komponente?
*/
const RequestBuilder = () => {
	let selectProps = {
		options: ['POST', 'GET', 'DELETE', 'PUT', 'HEAD'],
		label: "method"
	}
    return (
		<div className="w-1/2 h-full bg-gray-800 p-4">
			<div className="text-white text-2xl">Request Builder</div>
			{/* Method selection */}
			<Select {...selectProps}/>
			{/* Path */}

			{/* Header */}
			<JsonTextarea placeholder="Header"/>
			{/* Body */}
			<JsonTextarea placeholder="Body"/>
			</div>
    );
};

export { RequestBuilder };