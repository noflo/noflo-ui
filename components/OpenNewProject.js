const noflo = require('noflo');
const projects = require('../src/projects');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('project',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('hash',
    { datatype: 'array' });
  return c.process((input, output) => {
    if (!input.hasData('in', 'project')) {
      return;
    }
    const [data, project] = input.getData('in', 'project');
    output.send({
      out: project,
    });

    if (data.state.project || project.runtime) {
      // We're already in project view, no need to open
      output.done();
      return;
    }

    // Generate hash to open newly-created project
    projects.getProjectHash(project, (err, hash) => {
      if (err) {
        output.done();
        return;
      }
      output.sendDone({
        hash,
      });
    });
  });
};
