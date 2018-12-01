const noflo = require('noflo');
const uuid = require('uuid');

const decodeRuntime = (data) => {
  const runtime = {};
  data.split('&').forEach((param) => {
    const [key, value] = Array.from(param.split('='));
    runtime[key] = value;
  });
  if (runtime.protocol && runtime.address) {
    runtime.id = runtime.id || uuid.v4();
    return runtime;
  }
  return null;
};

const findRuntime = (id, runtimes) => {
  if (!(runtimes != null ? runtimes.length : undefined)) { return null; }
  const matching = runtimes.filter(rt => rt.id === id);
  if (matching.length) {
    return matching[0];
  }
  return null;
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('runtimes', {
    required: true,
    datatype: 'array',
  });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('new',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in', 'runtimes')) { return; }
    const [route, runtimes] = Array.from(input.getData('in', 'runtimes'));
    if (!route.runtime) {
      output.done(new Error('No runtime defined'));
      return;
    }
    if ((typeof route.runtime === 'string') && (route.runtime.substr(0, 9) === 'endpoint?')) {
      // Decode URL parameters
      route.runtime = decodeRuntime(route.runtime.substr(9));
    }
    // Match to local runtimes
    const persistedRuntime = findRuntime(route.runtime, runtimes);
    if (!persistedRuntime) {
      // This is a new runtime definition, save
      output.send({ new: route.runtime });
      output.send({ out: route });
      output.done();
      return;
    }
    route.runtime = persistedRuntime;
    output.send({ out: route });
    output.done();
  });
};
