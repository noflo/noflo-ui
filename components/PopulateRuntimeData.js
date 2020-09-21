const noflo = require('noflo');
const uuid = require('uuid/v4');

const decodeRuntime = (data) => {
  const runtime = {};
  data.split('&').forEach((param) => {
    const [key, value] = param.split('=');
    runtime[key] = value;
  });
  if (runtime.protocol && runtime.address) {
    return runtime;
  }
  return null;
};

const findRuntime = (newRuntime, runtimes) => {
  if (!runtimes || !runtimes.length) {
    return null;
  }
  let runtime = newRuntime;
  if (typeof newRuntime === 'string') {
    runtime = {
      id: newRuntime,
    };
  }
  return runtimes.find((rt) => {
    if (rt.id === runtime.id) {
      // Direct UUID match
      return true;
    }
    if (!runtime.id) {
      // New runtime given without UUID
      if (runtime.protocol === rt.protocol && runtime.address === rt.address) {
        return true;
      }
    }
    return false;
  });
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
    const [route, runtimes] = input.getData('in', 'runtimes');
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
      if (!route.runtime.id) {
        // FIXME: We should really only do this once we've connected and we know
        // if runtime provides UUID or not. Otherwise the UUID will change between
        // first instantiation and first connection.
        route.runtime.id = uuid();
      }
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
