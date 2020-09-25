const noflo = require('noflo');
const fbpSpec = require('fbp-spec');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Load fbp-spedc tests for the project';
  c.inPorts.add('in', {
    datatype: 'object',
  });
  c.outPorts.add('out', {
    datatype: 'object',
  });
  c.outPorts.add('error', {
    datatype: 'object',
  });
  return c.process((input, output) => {
    if (!input.hasData('in')) {
      return;
    }
    const { project } = input.getData('in');

    const suites = project.specs.filter((s) => s.language === 'yaml' && s.code)
      .map((s) => {
        try {
          return fbpSpec.testsuite.loadYAML(s.code);
        } catch (e) {
          // Ignore YAML errors for now
          return [];
        }
      })
      .reduce((flat, s) => flat.concat(s), []);

    output.sendDone({
      out: [...suites],
    });
  });
};
