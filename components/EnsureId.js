const noflo = require('noflo');

const randomString = function (num) {
  if (num == null) {
    num = 60466176; // 36^5
  }
  num = Math.floor(Math.random() * num);
  return num.toString(36);
};

exports.getComponent = function () {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('id',
    { datatype: 'string' });

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: ['out', 'id'],
    async: true,
  },
  (data, groups, out, callback) => {
    let id;
    if (data.properties) {
      // Graph
      if (data.properties.id) {
        // We already have an ID
        data.id = data.properties.id;
        out.out.send(data);
        out.id.send(data.id);
        callback();
        return;
      }
      id = randomString();
      data.properties.id = id;
      data.id = id;
      out.out.send(data);
      out.id.send(data.id);
      callback();
      return;
    }

    // Other types
    if (data.id) {
      out.out.send(data);
      out.id.send(data.id);
      callback();
      return;
    }
    data.id = randomString();
    out.out.send(data);
    out.id.send(data.id);
    return callback();
  });
};
