import noflo from "noflo";
//#region node_modules/noflo-core/components/Repeat.js
function getComponent() {
	const c = new noflo.Component();
	c.description = `Forwards packets and metadata in the same way
it receives them`;
	c.icon = "forward";
	c.inPorts.add("in", {
		datatype: "all",
		description: "Packet to forward"
	});
	c.outPorts.add("out", { datatype: "all" });
	return c.process((input, output) => {
		const data = input.get("in");
		output.sendDone({ out: data });
	});
}
//#endregion
export { getComponent as default };
