const noflo = require('noflo');
const { getGraphType, getComponentType, isDefaultRuntime } = require('../src/runtime');

const getType = (context) => {
  if (context.graphs.length) {
    // Current main graph in view
    const graphType = getGraphType(context.graphs[0]);
    if (graphType) { return graphType; }
  }
  if (context.component) {
    // Current component in editor
    const componentType = getComponentType(context.component);
    if (componentType) { return componentType; }
  }
  if (!context.project) { return null; }
  return context.project.type;
};

const findCompatibleRuntimes = (context, runtimes) => {
  const projectType = getType(context);
  return runtimes.filter((rt) => {
    if (projectType === 'all') { return true; }
    return rt.type === projectType;
  });
};

const findCurrentRuntime = (context, runtimes) => {
  // TODO: Switch runtime if no longer in list of compatible
  if (context.runtime) { return context.runtime; }
  if (!runtimes.length) { return null; }
  const [matched] = Array.from(runtimes.filter((rt) => {
    if (context.project && rt.project) {
      if (isDefaultRuntime(rt)) { return true; }
      if (rt.project !== context.project.id) { return false; }
    }
    if (context.project && (rt.project === context.project.id)) { return true; }
    if (rt.protocol === 'iframe') { return true; }
    return false;
  }));
  return matched || null;
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('runtimes',
    { datatype: 'array' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('skipped',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('in', 'runtimes')) { return; }
    const [context, runtimes] = input.getData('in', 'runtimes');

    context.compatible = findCompatibleRuntimes(context, runtimes);
    context.runtime = findCurrentRuntime(context, context.compatible);

    if (!context.runtime) {
      // No runtime matched, send as-is
      output.sendDone({ skipped: context });
      return;
    }

    output.sendDone({ out: context });
  });
};
