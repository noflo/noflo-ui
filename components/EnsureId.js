const noflo = require('noflo');

const randomString = (base) => {
  let num = base;
  if (num == null) {
    num = 60466176; // 36^5
  }
  num = Math.floor(Math.random() * num);
  return num.toString(36);
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('id',
    { datatype: 'string' });

  return c.process((input, output) => {
    const data = input.getData('in');
    if (data.properties) {
      // Graph
      if (data.properties.id) {
        // We already have an ID
        data.id = data.properties.id;
        output.sendDone({
          out: data,
          id: data.id,
        });
        return;
      }
      const id = randomString();
      data.properties.id = id;
      data.id = id;
      output.sendDone({
        out: data,
        id: data.id,
      });
      return;
    }

    // Other types
    if (data.id) {
      output.sendDone({
        out: data,
        id: data.id,
      });
      return;
    }
    data.id = randomString();
    output.sendDone({
      out: data,
      id: data.id,
    });
  });
};
