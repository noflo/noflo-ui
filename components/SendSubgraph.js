const noflo = require('noflo');
const { graphRuntimeIdentifier } = require('../src/runtime');

function sendGraph(client, graph, namespace, main = false) {
  return client.protocol.graph.send({
    ...graph,
    name: graphRuntimeIdentifier(graph, namespace),
    properties: {
      ...graph.properties,
      library: namespace,
    },
  }, main);
}

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('client',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in', 'client')) { return; }
    const [data, client] = input.getData('in', 'client');

    const {
      currentGraph,
      subgraph,
      nodes,
      project,
    } = data;
    const namespace = project ? project.namespace : null;

    const usedPorts = [];
    const portMap = {};
    const subgraphPort = (node, port) => {
      const portId = `${node}_${port}`;
      if (portMap[portId]) {
        return portMap[portId];
      }
      if (usedPorts.indexOf(port) === -1) {
        // Keep port names simple as long as we can
        usedPorts.push(port);
        portMap[portId] = port;
        return port;
      }
      const portName = portId.replace(/(.*)\/(.*)(_.*)\.(.*)/, '$2_$4').toLowerCase();
      usedPorts.push(portName);
      portMap[portId] = portName;
      return portName;
    };

    // First populate the subgraph with nodes, edges, and ports
    subgraph.startTransaction('newsubgraph');
    subgraph.setProperties({
      id: `${project.id}/${subgraph.name.replace(' ', '_')}`,
      project: project.id,
      main: false,
    });
    // Copy nodes
    nodes.forEach((id) => {
      const node = currentGraph.getNode(id);
      subgraph.addNode(node.id, node.component, node.metadata);
    });
    // Copy edges between nodes
    currentGraph.edges.forEach((edge) => {
      if (subgraph.getNode(edge.from.node) && subgraph.getNode(edge.to.node)) {
        subgraph.addEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port, edge.metadata);
      }
    });
    // Move IIPs to subgraph as well
    currentGraph.initializers.forEach((iip) => {
      if (subgraph.getNode(iip.to.node)) {
        subgraph.addInitial(iip.from.data, iip.to.node, iip.to.port, iip.metadata);
      }
    });
    currentGraph.edges.forEach((edge) => {
      // Edge from outside the new subgraph to a subgraph port
      if (!subgraph.getNode(edge.from.node) && subgraph.getNode(edge.to.node)) {
        // Create exported inport
        const inport = subgraphPort(edge.to.node, edge.to.port);
        subgraph.addInport(inport, edge.to.node, edge.to.port);
      }
      // Edge from subgraph port to the outside
      if (subgraph.getNode(edge.from.node) && !subgraph.getNode(edge.to.node)) {
        // Create exported outport
        const outport = subgraphPort(edge.from.node, edge.from.port);
        subgraph.addOutport(outport, edge.from.node, edge.from.port);
      }
    });
    // Emit new subgraph so that it can be stored
    subgraph.endTransaction('newsubgraph');

    client.connect()
      .then(() => sendGraph(client, subgraph, namespace, false))
      .then(() => new Promise((resolve) => setTimeout(resolve, 10)))
      .then(() => {
        currentGraph.startTransaction('subgraph');
        const componentName = project.namespace ? `${project.namespace}/${subgraph.name}` : subgraph.name;
        const initialMetadata = currentGraph.getNode(nodes[0]).metadata;
        const nodeId = subgraph.properties.id;
        currentGraph.addNode(nodeId, componentName, {
          label: subgraph.name,
          x: initialMetadata.x,
          y: initialMetadata.y,
        });
        // Reconnect external edges to subgraph node
        currentGraph.edges.forEach((edge) => {
          // Edge from outside the new subgraph to a subgraph port
          if (!subgraph.getNode(edge.from.node) && subgraph.getNode(edge.to.node)) {
            const inport = subgraphPort(edge.to.node, edge.to.port);
            currentGraph.addEdge(
              edge.from.node,
              edge.from.port,
              nodeId,
              inport,
              edge.metadata,
            );
          }
          // Edge from subgraph port to the outside
          if (subgraph.getNode(edge.from.node) && !subgraph.getNode(edge.to.node)) {
            const outport = subgraphPort(edge.from.node, edge.from.port);
            currentGraph.addEdge(
              nodeId,
              outport,
              edge.to.node,
              edge.to.port,
              edge.metadata,
            );
          }
        });
        // Remove the nodes moved to the subgraph
        nodes.forEach((id) => {
          currentGraph.removeNode(id);
        });
        // End the transaction on the main graph
        currentGraph.endTransaction('subgraph');
      })
      .then(() => {
        output.sendDone({
          out: subgraph,
        });
      }, (err) => output.done(err));
  });
};
