const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'indent';
  c.inPorts.add('context',
    { datatype: 'object' });
  c.inPorts.add('key', {
    datatype: 'string',
    control: true,
    required: true,
  });
  c.inPorts.add('value',
    { datatype: 'all' });
  c.outPorts.add('context',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('context', 'key', 'value')) {
      return;
    }
    const [context, key, value] = input.getData('context', 'key', 'value');
    context[key] = value;
    output.sendDone({
      context,
    });
  });
};
