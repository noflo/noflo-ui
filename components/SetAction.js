const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('action', {
    datatype: 'string',
    required: true,
    control: true,
  });
  c.inPorts.add('in',
    { datatype: 'all' });
  c.outPorts.add('out', {
    datatype: 'all',
    scoped: false,
  });

  return c.process((input, output) => {
    if (!input.hasData('in', 'action')) {
      return;
    }
    const [action, payload] = input.getData('action', 'in');
    output.sendDone({
      out: {
        action,
        payload,
      },
    });
  });
};
