import noflo from "noflo";
//#region node_modules/noflo-core/components/Output.js
const log = (options, data) => {
	if (options != null) return import("node:util").then(({ inspect }) => {
		return console.log(inspect(data, options.showHidden, options.depth, options.colors));
	}).catch((_e) => {
		console.log(data);
	});
	console.log(data);
};
function getComponent() {
	const c = new noflo.Component();
	c.description = "Sends the data items to console.log";
	c.icon = "bug";
	c.inPorts.add("in", {
		datatype: "all",
		description: "Packet to be printed through console.log"
	});
	c.inPorts.add("options", {
		datatype: "object",
		description: "Options to be passed to console.log",
		control: true
	});
	c.outPorts.add("out", { datatype: "all" });
	return c.process((input, output) => {
		if (!input.hasData("in")) return;
		if (input.attached("options").length && !input.hasData("options")) return;
		let options = null;
		if (input.has("options")) options = input.getData("options");
		const data = input.getData("in");
		log(options, data);
		output.sendDone({ out: data });
	});
}
//#endregion
export { getComponent as default };
