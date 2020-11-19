const noflo = require('noflo');
const {
  getGraphType,
  getComponentType,
  getRemoteNodes,
  ensureIframe,
  graphRuntimeIdentifier,
} = require('../src/runtime');

const sendGraphs = (client, graphs, namespace = null) => {
  const compatible = graphs.filter((g) => getGraphType(g) === client.definition.type);
  compatible.sort((a, b) => {
    if (a.properties.main) {
      return 1;
    }
    if (b.properties.main) {
      return -1;
    }
    const aName = graphRuntimeIdentifier(a, namespace);
    const bName = graphRuntimeIdentifier(b, namespace);
    const inA = a.nodes.find((n) => n.component === bName);
    if (inA) {
      // Send b first
      return 1;
    }
    const inB = b.nodes.find((n) => n.component === aName);
    if (inB) {
      // Send a first
      return -1;
    }
    return 0;
  });
  return compatible.reduce((chain, g) => chain
    .then(() => client
      .protocol.graph.send({
        ...g,
        name: graphRuntimeIdentifier(g, namespace),
        properties: {
          ...g.properties,
          library: namespace,
        },
      }, g.properties.main)), Promise.resolve([]));
};

const sendComponents = (client, components, namespace = null) => {
  const compatible = components.filter((c) => [
    null,
    client.definition.type,
  ].includes(getComponentType(c)));
  return Promise.all(compatible.map((c) => client.protocol.component.source({
    name: c.name,
    language: c.language,
    library: namespace || client.definition.namespace,
    code: c.code,
  })));
};

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
    const [route, client] = input.getData('in', 'client');
    if (route.project.runtime) {
      output.done(new Error('Runtime projects must be accessed via runtime'));
      return;
    }

    if (route.remote != null ? route.remote.length : undefined) {
      // We need to fetch components from runtime, send "loading"
      route.state = 'loading';
    }
    // Send initial state
    output.send({ out: route });

    Promise.resolve()
      .then(() => ensureIframe(client, route.project))
      .then(() => client.connect())
      .then(() => sendComponents(client, route.project.components, route.project.namespace))
      .then(() => sendGraphs(client, route.project.graphs, route.project.namespace))
      .then(() => {
        if (!(route.graphs != null ? route.graphs.length : undefined)) {
          return Promise.resolve();
        }
        if (client.transport.graph === route.graphs[0]) {
          return Promise.resolve();
        }
        client.transport.setMain(route.graphs[0]);
        return Promise.resolve();
      })
      .then(() => getRemoteNodes(client, route))
      .then(() => {
        if (route.state !== 'loading') { return Promise.resolve(); }
        // We fetched things from runtime, update state
        route.state = 'ok';
        return output.send({ out: route });
      })
      .then((() => output.done()), (err) => output.done(err));
  });
};
