const noflo = require('noflo');

const getData = (input, port) => input.getStream(port).filter((ip) => {
  // Drop brackets at this stage
  if (ip.type !== 'data') { return false; }
  // Drop 'empty' result
  if (!ip.data || (ip.data === true)) { return false; }
  return true;
}).map(ip => ip.data);

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('project',
    { datatype: 'object' });
  c.inPorts.add('graph',
    { datatype: 'object' });
  c.inPorts.add('component',
    { datatype: 'object' });
  c.inPorts.add('spec',
    { datatype: 'object' });
  c.inPorts.add('runtime',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasStream('project', 'graph', 'component', 'spec', 'runtime')) { return; }
    const result = {
      projects: getData(input, 'project'),
      graphs: getData(input, 'graph'),
      components: getData(input, 'component'),
      specs: getData(input, 'spec'),
      runtimes: getData(input, 'runtime'),
    };
    output.sendDone({ out: result });
  });
};
