const noflo = require('noflo');
const { getComponentType } = require('../src/runtime');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('project',
    { datatype: 'object' });
  c.inPorts.add('client',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in', 'project', 'client')) { return; }
    const [data, project, client] = Array.from(input.getData('in', 'project', 'client'));

    const { component } = data;
    const componentType = getComponentType(component);
    if (componentType && (componentType !== client.definition.type)) {
      // Ignore components for different runtime type
      output.done();
      return;
    }

    client.connect()
      .then(() => client.protocol.component.source({
        name: component.name,
        language: component.language,
        library: (project != null ? project.namespace : undefined) || client.definition.namespace,
        code: component.code,
        tests: component.tests,
      }))
      .then(componentDefinition => output.send({
        out: {
          component: componentDefinition,
          runtime: client.definition.id,
        },
      }))
      .then((() => output.done()), err => output.done(err));
  });
};
