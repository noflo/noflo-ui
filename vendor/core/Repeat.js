// node_modules/@noflo/core/components/Repeat.js
import { Component } from "../noflo.js";
function getComponent() {
  const c = new Component({
    description: "Forwards packets and metadata in the same way it receives them",
    icon: "forward",
    inPorts: {
      in: {
        datatype: "all",
        description: "Packet to forward",
        required: true
      }
    },
    outPorts: {
      out: {
        datatype: "all"
      }
    }
  });
  c.process((input, output) => {
    if (!input.hasData("in")) {
      return;
    }
    const data = input.getData("in");
    output.sendDone({ out: data });
  });
  return c;
}
export {
  getComponent
};
