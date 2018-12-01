const noflo = require('noflo');
const { getGraphType } = require('../src/runtime');

const preparePayload = function(event, original, graph) {
  const payload = {};
  for (let key in original) {
    const val = original[key];
    if ((key === 'from') && ((event.indexOf('edge') !== -1) || (event.indexOf('initial') !== -1))) {
      payload.src = val;
      continue;
    }
    if ((key === 'to') && ((event.indexOf('edge') !== -1) || (event.indexOf('initial') !== -1))) {
      payload.tgt = val;
      continue;
    }
    if ((key === 'metadata') && ['removenode', 'removeedge', 'removeinitial', 'removeinport', 'removeoutport', 'removegroup'].includes(event)) {
      continue;
    }
    if (['node', 'port'].includes(key) && ['removeinport', 'removeoutport'].includes(event)) {
      continue;
    }
    if ((key === 'component') && ['changenode', 'removenode'].includes(event)) {
      continue;
    }
    if ((key === 'metadata') && val) {
      payload.metadata = {};
      for (let metaKey in val) {
        const metaVal = val[metaKey];
        if ((metaKey === 'route') && (metaVal === null)) {
          continue;
        }
        payload.metadata[metaKey] = metaVal;
      }
    }
    payload[key] = val;
  }
  payload.graph = graph.name || graph.properties.id;
  return payload;
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'object'});
  c.inPorts.add('project',
    {datatype: 'object'});
  c.inPorts.add('client',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});
  return c.process(function(input, output) {
    if (!input.hasData('in', 'project', 'client')) { return; }
    const [data, project, client] = Array.from(input.getData('in', 'project', 'client'));

    const graphType = getGraphType(data.graph);
    if (graphType && (graphType !== client.definition.type)) {
      // Ignore graphs for different runtime type
      output.done();
      return;
    }

    // There are several types of graph changes that we don't have protocol events for
    const relevantChanges = data.changes.map(function(c) {
      c.event = c.event.toLowerCase();
      return c;
    }).filter(c => client.protocol.graph[c.event]);

    return client.connect()
      .then(() =>
        Promise.all(relevantChanges.map(change => client.protocol.graph[change.event](preparePayload(change.event, change.payload, data.graph))))
      )
      .then((() => output.done()), err => output.done(err));
  });
};
