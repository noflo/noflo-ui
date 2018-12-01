const noflo = require('noflo');
const fbpGraph = require('fbp-graph');
const { loadGraph } = require('../src/runtime');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'object'});
  c.inPorts.add('client',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return c.process(function(input, output) {
    if (!input.hasData('in', 'client')) { return; }
    const [route, client] = Array.from(input.getData('in', 'client'));

    const state = {
      state: 'ok',
      graphs: [],
      remote: [],
      project: {},
      component: null,
      runtime: route.runtime
    };

    return client.connect()
      .then(function(def) {
        // Start by loading main graph
        if (!def.graph) {
          return Promise.reject(new Error(`Runtime ${def.id} is not running a graph`));
        }

        // TODO: Populate project information

        return client.protocol.component.getsource({
          name: def.graph
        });
      })
      .then(loadGraph)
      .then(graphInstance => state.graphs.push(graphInstance))
      .then(() =>
        output.send({
          out: state})
      )
      .then((() => output.done()), err => output.done(err));
  });
};
