const noflo = require('noflo');
const uuid = require('uuid');

const iframeAddress = 'https://noflojs.org/noflo-browser/everything.html?fbp_noload=true&fbp_protocol=iframe';

const ensureOneIframeRuntime = (runtimes) => {
  const foundLocal = runtimes.find((runtime) => {
    // Check that we don't have the iframe runtime already
    if ((runtime.protocol === 'iframe') && (runtime.address === iframeAddress)) {
      return true;
    }
    return false;
  });
  if (foundLocal) {
    return null;
  }
  const iframeRuntime = {
    label: 'NoFlo HTML5 environment',
    id: uuid(),
    protocol: 'iframe',
    address: iframeAddress,
    type: 'noflo-browser',
    seen: Date.now(),
  };
  return iframeRuntime;
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'array' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('runtimes',
    { datatype: 'array' });

  return noflo.helpers.WirePattern(c, {
    out: ['out', 'runtimes'],
    async: true,
    forwardGroups: false,
  },
  (runtimes = [], groups, out, callback) => {
    const iframeRuntime = ensureOneIframeRuntime(runtimes);
    if (iframeRuntime) {
      // Added iframe runtime
      out.out.send(iframeRuntime);
      runtimes.push(iframeRuntime);
    }
    out.runtimes.send(runtimes);
    callback();
  });
};
