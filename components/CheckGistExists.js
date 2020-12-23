const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('existing',
    { datatype: 'array' });
  c.outPorts.add('new',
    { datatype: 'object' });

  return c.process((input, output) => {
    const data = input.getData('in');
    if (!data.state || !data.state.projects || !data.state.projects.length) {
      // No local projects, pass
      output.sendDone({
        new: data,
      });
      return;
    }

    const existing = data.state.projects.filter((project) => project.gist === data.payload.graph);
    if (!existing.length) {
      output.sendDone({
        new: data,
      });
      return;
    }

    output.sendDone({
      existing: [
        'project',
        existing[0].id,
        existing[0].main,
      ],
    });
  });
};
