const noflo = require('noflo');

const getValues = (keys, state) => {
  const values = keys.map((key) => {
    if (key.indexOf('[') === -1) { return state[key]; }
    const matched = key.match(/(.*)\[([0-9]+|last)\]/);
    if (!matched) { return null; }
    const arr = state[matched[1]];
    if (matched[2] === 'last') {
      return arr[arr.length - 1];
    }
    return arr[matched[2]];
  });
  return values;
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Reads requested keys from action and sends them out alongside the action payload';
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('keys', {
    datatype: 'string',
    control: true,
  });
  c.outPorts.add('values', {
    datatype: 'all',
    addressable: true,
  });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('state',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in')) { return; }
    if (input.attached('keys').length && !input.hasData('keys')) { return; }

    const data = input.getData('in');

    if (input.hasData('keys')) {
      const keys = input.getData('keys').split(',');
      const values = getValues(keys, data.state);
      for (let idx = 0; idx < values.length; idx += 1) {
        const value = values[idx];
        output.send({
          values: new noflo.IP('data', value,
            { index: idx }),
        });
      }
    }
    output.sendDone({
      state: data.state || {},
      out: data.payload || data,
    });
  });
};
