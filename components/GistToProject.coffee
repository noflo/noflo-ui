noflo = require 'noflo'
octo = require 'octo'
path = require 'path'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
    required: true
  c.inPorts.add 'token',
    datatype: 'string'
    required: true
  c.outPorts.add 'graph',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'object'
  c.outPorts.add 'project',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: ['token']
    out: ['graph', 'component', 'project']
    async: true
  , (data, groups, out, callback) ->
    api = octo.api()
    api.token c.params.token if c.params.token

    project =
      id: data.graph
      gist: data.graph
      graphs: []
      components: []
      specs: []

    request = api.get "/gists/#{data.graph}"
    request.on 'success', (res) ->
      unless res.body?.files
        return callback new Error "Gist #{data.gist} didn't provide any files"
      project.name = res.body.description
      for name, file of res.body.files
        basename = path.basename name, path.extname name
        if path.extname(name) is '.json'
          # JSON graph
          noflo.graph.loadJSON file.content, (err, graph) ->
            graph.setProperties
              project: project.id
              id: "#{project.id}_#{basename}"
            project.main = graph.properties.id unless project.main
            project.name = graph.name unless project.name
            if graph.properties?.environment?.type
              project.type = graph.properties.environment.type unless project.type
            project.graphs.push graph
          continue
        # Component
        component =
          name: basename
          language: file.language
          project: project.id
          code: file.content
          tests: ''
        project.components.push
        continue
      out.project.send project
      for graph in project.graphs
        out.graph.send graph
      for component in project.components
        components.push component
      do callback
    request.on 'error', (err) ->
      callback err.error or err.body
    do request
