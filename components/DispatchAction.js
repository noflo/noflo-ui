const noflo = require('noflo');

const findHandler = (actionParts, routes) => {
  const normalized = routes.map((route) => {
    if (route.indexOf('*') === -1) {
      // No wildcards here
      return route;
    }
    const routeParts = route.split(':');
    const expanded = routeParts.map((part, idx) => {
      if (part !== '*') { return part; }
      if (!actionParts[idx]) { return part; }
      return actionParts[idx];
    });
    return expanded.join(':');
  });
  return normalized.indexOf(actionParts.join(':'));
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'code-fork';
  c.inPorts.add('routes', {
    datatype: 'string',
    required: true,
    control: true,
  });
  c.inPorts.add('in',
    { datatype: 'all' });
  c.outPorts.add('pass',
    { datatype: 'all' });
  c.outPorts.add('handle', {
    datatype: 'all',
    addressable: true,
  });
  c.outPorts.add('handling',
    { datatype: 'integer' });
  c.forwardBrackets = {};
  return c.process((input, output) => {
    if (!input.hasData('routes', 'in')) { return; }
    const [routes, data] = Array.from(input.getData('routes', 'in'));
    if (!(data != null ? data.action : undefined)) {
      output.sendDone({ pass: data });
      return;
    }
    const handled = routes.split(',');
    const handler = findHandler(data.action.split(':'), handled);
    if (handler === -1) {
      output.sendDone({ pass: data });
      return;
    }
    output.send({
      handling: handler,
      handle: new noflo.IP('data', data,
        { index: handler }),
    });
    output.done();
  });
};
