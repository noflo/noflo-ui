const noflo = require('noflo');
const {
  getGraphType,
  getComponentType,
  getRemoteNodes,
  ensureIframe,
} = require('../src/runtime');

const sendGraphs = (client, graphs, currentGraphs) => {
  const compatible = graphs.filter(g => getGraphType(g) === client.definition.type);
  return Promise.all(compatible.map((g) => {
    const main = g === currentGraphs[0];
    return client.protocol.graph.send(g, main);
  }));
};

const sendComponents = (client, components, namespace) => {
  const compatible = components.filter(c => [
    null,
    client.definition.type,
  ].includes(getComponentType(c)));
  return Promise.all(compatible.map(c => client.protocol.component.source({
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
      .then(() => sendGraphs(client, route.project.graphs, route.graphs))
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
      .then((() => output.done()), err => output.done(err));
  });
};
