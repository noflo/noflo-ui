const noflo = require('noflo');
const octo = require('octo');
const path = require('path');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in', {
    datatype: 'object',
    required: true
  }
  );
  c.inPorts.add('token', {
    datatype: 'string',
    required: true
  }
  );
  c.outPorts.add('graph',
    {datatype: 'object'});
  c.outPorts.add('component',
    {datatype: 'object'});
  c.outPorts.add('project',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    params: ['token'],
    out: ['graph', 'component', 'project'],
    async: true
  }
  , function(data, groups, out, callback) {
    const api = octo.api();
    if (c.params.token) { api.token(c.params.token); }

    const project = {
      id: data.graph,
      gist: data.graph,
      graphs: [],
      components: [],
      specs: []
    };

    const request = api.get(`/gists/${data.graph}`);
    request.on('success', function(res) {
      let component;
      if (!(res.body != null ? res.body.files : undefined)) {
        return callback(new Error(`Gist ${data.gist} didn't provide any files`));
      }
      project.name = res.body.description;
      for (let name in res.body.files) {
        const file = res.body.files[name];
        var basename = path.basename(name, path.extname(name));
        if (path.extname(name) === '.json') {
          // JSON graph
          noflo.graph.loadJSON(file.content, function(err, graph) {
            graph.setProperties({
              project: project.id,
              id: `${project.id}_${basename}`
            });
            if (!project.main) { project.main = graph.properties.id; }
            if (!project.name) { project.name = graph.name; }
            if (__guard__(graph.properties != null ? graph.properties.environment : undefined, x => x.type)) {
              if (!project.type) { project.type = graph.properties.environment.type; }
            }
            return project.graphs.push(graph);
          });
          continue;
        }
        // Component
        component = {
          name: basename,
          language: file.language,
          project: project.id,
          code: file.content,
          tests: ''
        };
        project.components.push;
        continue;
      }
      out.project.send(project);
      for (let graph of Array.from(project.graphs)) {
        out.graph.send(graph);
      }
      for (component of Array.from(project.components)) {
        components.push(component);
      }
      return callback();
    });
    request.on('error', err => callback(err.error || err.body));
    return request();
  });
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}