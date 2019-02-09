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
  });
  c.outPorts.add('graph',
    { datatype: 'object' });
  c.outPorts.add('component',
    { datatype: 'object' });
  c.outPorts.add('project',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    params: ['token'],
    out: ['graph', 'component', 'project'],
    async: true,
  },
  (data, groups, out, callback) => {
    const api = octo.api();
    if (c.params.token) { api.token(c.params.token); }

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
        callback(new Error(`Gist ${data.gist} didn't provide any files`));
        return;
      }
      project.name = res.body.description;
      Object.keys(res.body.files).forEach((name) => {
        const file = res.body.files[name];
        const basename = path.basename(name, path.extname(name));
        if (path.extname(name) === '.json') {
          // JSON graph
          noflo.graph.loadJSON(file.content, (err, graph) => {
            graph.setProperties({
              project: project.id,
              id: `${project.id}_${basename}`,
            });
            if (!project.main) { project.main = graph.properties.id; }
            if (!project.name) { project.name = graph.name; }
            if (graph.properties
              && graph.properties.environment
              && graph.properties.environment.type
              && !project.type) {
              project.type = graph.properties.environment.type;
            }
            return project.graphs.push(graph);
          });
          return;
        }
        // Component
        const component = {
          name: basename,
          language: file.language,
          project: project.id,
          code: file.content,
          tests: '',
        };
        project.components.push(component);
      });
      out.project.send(project);
      project.graphs.forEach((graph) => {
        out.graph.send(graph);
      });
      project.components.forEach((component) => {
        out.components.send(component);
      });
      callback();
    });
    request.on('error', err => callback(err.error || err.body));
    return request();
  });
};
