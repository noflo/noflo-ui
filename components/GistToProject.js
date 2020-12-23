const noflo = require('noflo');
const octo = require('octo');
const path = require('path');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in', {
    datatype: 'object',
    required: true,
  });
  c.inPorts.add('token', {
    datatype: 'string',
    required: true,
    control: true,
  });
  c.outPorts.add('graph',
    { datatype: 'object' });
  c.outPorts.add('component',
    { datatype: 'object' });
  c.outPorts.add('project',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('in')) {
      return;
    }
    const api = octo.api();
    if (input.hasData('token')) {
      api.token(input.getData('token'));
    }

    const data = input.getData('in');
    const project = {
      id: data.graph,
      gist: data.graph,
      graphs: [],
      components: [],
      specs: [],
    };

    const request = api.get(`/gists/${data.graph}`);
    request.on('success', (res) => {
      if (!(res.body != null ? res.body.files : undefined)) {
        output.done(new Error(`Gist ${data.gist} didn't provide any files`));
        return;
      }
      project.name = res.body.description;
      Promise.all(Object.keys(res.body.files).map((name) => {
        const file = res.body.files[name];
        const basename = path.basename(name, path.extname(name));
        if (path.extname(name) === '.json') {
          // JSON graph
          return noflo.graph.loadJSON(file.content)
            .then((graph) => {
              graph.setProperties({
                project: project.id,
                id: `${project.id}/${basename}`,
              });
              if (!project.main) { project.main = graph.properties.id; }
              if (!project.name) { project.name = graph.name; }
              if (graph.properties
                && graph.properties.environment
                && graph.properties.environment.type
                && !project.type) {
                project.type = graph.properties.environment.type;
              }
              project.graphs.push(graph);
            });
        }
        // Component
        const component = {
          name: basename,
          language: file.language,
          project: project.id,
          id: `${project.id}/${basename}`,
          code: file.content,
          tests: '',
        };
        project.components.push(component);
        return Promise.resolve();
      }))
        .then(() => {
          const graphs = [...project.graphs];
          const components = [...project.components];
          output.send({
            project,
          });
          graphs.forEach((graph) => {
            output.send({
              graph,
            });
          });
          components.forEach((component) => {
            output.send({
              components: component,
            });
          });
          output.done();
        });
    });
    request.on('error', (err) => output.done(err.error || err.body));
    request();
  });
};
