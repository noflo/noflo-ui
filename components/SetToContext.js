const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.icon = 'indent';
  c.inPorts.add('context',
    {datatype: 'object'});
  c.inPorts.add('key', {
    datatype: 'string',
    required: true
  }
  );
  c.inPorts.add('value',
    {datatype: 'all'});
  c.outPorts.add('context',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: ['context', 'value'],
    params: 'key',
    out: 'context',
    async: true
  }
  , function(data, groups, out, callback) {
    data.context[c.params.key] = data.value;
    out.send(data.context);
    return callback();
  });
};
