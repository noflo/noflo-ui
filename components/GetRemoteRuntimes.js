const noflo = require('noflo');
const registry = require('flowhub-registry');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('user',
    { datatype: 'object' });
  c.inPorts.add('runtimes', {
    datatype: 'array',
    required: true,
    control: true,
  });
  c.outPorts.add('runtime',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('user', 'runtimes')) {
      return;
    }
    const [data, localRuntimes] = input.getData('user', 'runtimes');
    if (!data['flowhub-token']) {
      output.done();
      return;
    }
    const knownRuntimes = localRuntimes || [];
    registry.list(data['flowhub-token'],
      {
        host: process.env.NOFLO_REGISTRY_SERVICE,
      },
      (err, runtimes) => {
        if (err) {
          output.done(err);
          return;
        }
        const updateRts = runtimes.filter((runtime) => {
          const rt = runtime;
          const known = knownRuntimes.find((knownRuntime) => knownRuntime.id === rt.runtime.id);
          if (!known) { return true; }
          const knownSeen = new Date(known.seen);
          if ((rt.runtime.seen.getTime() === knownSeen.getTime())
            && (rt.runtime.address === known.address) && (rt.runtime.secret === known.secret)) {
            return false;
          }
          // Copy information we only get by connecting
          rt.runtime.capabilities = known.capabilities;
          rt.runtime.components = known.components;
          return true;
        });
        if (!updateRts.length) {
          output.done();
          return;
        }
        output.send({
          runtime: new noflo.IP('openBracket', process.env.NOFLO_REGISTRY_SERVICE),
        });
        updateRts.forEach((rt) => {
          output.send({
            runtime: rt.runtime,
          });
        });
        output.sendDone({
          runtime: new noflo.IP('closeBracket', process.env.NOFLO_REGISTRY_SERVICE),
        });
      });
  });
};
