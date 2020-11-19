const noflo = require('noflo');
const { getGraphType, graphRuntimeIdentifier } = require('../src/runtime');

const preparePayload = (event, original, graph, namespace) => {
  const payload = {};
  Object.keys(original).forEach((key) => {
    const val = original[key];
    if ((key === 'from') && ((event.indexOf('edge') !== -1) || (event.indexOf('initial') !== -1))) {
      payload.src = val;
      return;
    }
    if ((key === 'to') && ((event.indexOf('edge') !== -1) || (event.indexOf('initial') !== -1))) {
      payload.tgt = val;
      return;
    }
    if ((key === 'metadata') && ['removenode', 'removeedge', 'removeinitial', 'removeinport', 'removeoutport', 'removegroup'].includes(event)) {
      return;
    }
    if (key === 'nodes' && ['changegroup', 'removegroup'].includes(event)) {
      return;
    }
    if (['node', 'port'].includes(key) && ['removeinport', 'removeoutport'].includes(event)) {
      return;
    }
    if ((key === 'component') && ['changenode', 'removenode'].includes(event)) {
      return;
    }
    if ((key === 'metadata') && val) {
      payload.metadata = {};
      Object.keys(val).forEach((metaKey) => {
        const metaVal = val[metaKey];
        if ((metaKey === 'route') && (metaVal === null)) {
          return;
        }
        payload.metadata[metaKey] = metaVal;
      });
    }
    payload[key] = val;
  });
  payload.graph = graphRuntimeIdentifier(graph, namespace);
  return payload;
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('project',
    { datatype: 'object' });
  c.inPorts.add('client',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in', 'project', 'client')) { return; }
    const [data, client] = input.getData('in', 'client');
    const project = input.getData('project');

    const graphType = getGraphType(data.graph);
    if (graphType && (graphType !== client.definition.type)) {
      // Ignore graphs for different runtime type
      output.done();
      return;
    }

    // There are several types of graph changes that we don't have protocol events for
    const relevantChanges = data.changes.map((change) => {
      const changed = change;
      changed.event = change.event.toLowerCase();
      return changed;
    }).filter((change) => client.protocol.graph[change.event]);

    client.connect()
      .then(() => Promise.all(relevantChanges.map((change) => client.protocol.graph[change.event](
        preparePayload(change.event, change.payload, data.graph, project.namespace),
      ).catch((e) => {
        if (e.message === 'Requested graph not found') {
          // Runtime doesn't know about the graph we're changing, send the whole thing
          return client.protocol.graph.send({
            ...data.graph,
            name: graphRuntimeIdentifier(data.graph, project.namespace),
            properties: {
              ...data.graph.properties,
              library: project.namespace,
            },
          }, data.graph.properties.main);
        }
        return Promise.reject(e);
      }))))
      .then((() => output.done()), (err) => output.done(err));
  });
};
