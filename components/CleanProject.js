const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  return c.process((input, output) => {
    const data = input.getData('in');
    output.sendDone({
      out: {
        id: data.id,
        name: data.name,
        namespace: data.namespace,
        runtime: data.runtime,
        type: data.type,
        repo: data.repo,
        branch: data.branch,
        gist: data.gist,
        main: data.main,
      },
    });
  });
};
