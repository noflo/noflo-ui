const noflo = require('noflo');
const fbpSpec = require('fbp-spec');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Execute fbp-spedc tests in the project';
  c.inPorts.add('in', {
    datatype: 'object',
  });
  c.inPorts.add('client', {
    datatype: 'object',
  });
  c.outPorts.add('out', {
    datatype: 'object',
  });
  c.outPorts.add('error', {
    datatype: 'object',
  });
  return c.process((input, output) => {
    if (!input.hasData('in', 'client')) {
      return;
    }
    const [project, client] = input.getData('in', 'client');

    const suites = project.specs.filter((s) => s.language === 'yaml' && s.code)
      .map((s) => fbpSpec.testsuite.loadYAML(s.code))
      .reduce((flat, s) => flat.concat(s), []);

    if (!suites.length) {
      output.done();
    }

    // Send initial test suite list before execution
    output.send({
      out: [...suites],
    });

    client.connect()
      .then(() => new Promise((resolve, reject) => {
        const runner = new fbpSpec.runner.Runner(client);
        fbpSpec.runner.runAll(
          runner,
          suites,
          () => {
            // Send suite again with test results
            output.send({
              out: suites,
            });
          },
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          },
        );
      }))
      .then((() => output.done()), (err) => output.done(err));
  });
};
