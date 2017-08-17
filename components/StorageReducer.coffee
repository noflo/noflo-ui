noflo = require 'noflo'
collections = require '../src/collections'

findProject = (entity, projects) ->
  projectId = entity.properties?.project or entity.project
  return null unless projectId
  for project in projects
    continue unless project.id is projectId
    return project
  return null

exports.getComponent = ->
  c = new noflo.Component
  c.icon = 'database'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'projectcontext',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    out: ['out', 'projectcontext']
    forwardGroups: false
    async: true
  , (data, groups, out, callback) ->
    switch data.action
      when 'storage:db'
        state = data.state or {}
        state.db = data.payload
        out.out.send state
        do callback
      when 'storage:opened'
        out.out.send data.payload
        state = data.state or {}
        ctx = data.payload
        ctx.runtimes = state.runtimes
        out.projectcontext.send ctx
        do callback
      when 'storage:stored:project'
        state = {}
        project = data.payload
        project.graphs = [] unless project.graphs
        project.components = [] unless project.components
        project.specs = [] unless project.specs
        state.projects = data.state.projects or []
        collections.addToList state.projects, project
        out.out.send state
        do callback
      when 'storage:removed:project'
        state = {}
        state.projects = data.state.projects or []
        collections.removeFromList state.projects,
          id: data.payload
        out.out.send state
        do callback
      when 'storage:removed:graph'
        state = {}
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        return callback() unless project
        collections.removeFromList project.graphs,
          id: data.payload
        out.out.send state
        do callback
      when 'storage:stored:graph'
        state = {}
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          return callback new Error "No project found for graph #{data.payload.properties.id}"
        collections.addToList project.graphs, data.payload
        out.out.send state
        do callback
      when 'storage:stored:component'
        state = {}
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          return callback new Error "No project found for component #{data.payload.id}"
        collections.addToList project.components, data.payload
        out.out.send state
        do callback
      when 'storage:removed:component'
        state = {}
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        return callback() unless project
        collections.removeFromList project.components,
          id: data.payload
        out.out.send state
        do callback
      when 'storage:removed:spec'
        state = {}
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        return callback() unless project
        collections.removeFromList project.specs,
          id: data.payload
        out.out.send state
        do callback
      when 'storage:stored:spec'
        state = {}
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          return callback new Error "No project found for spec #{data.payload.id}"
        collections.addToList project.specs, data.payload
        out.out.send state
        do callback
      when 'storage:stored:runtime'
        state = {}
        state.runtimes = data.state.runtimes or []
        collections.addToList state.runtimes, data.payload, (a, b) ->
          unless a.seen
            return 1
          unless b.seen
            return -1
          aSeen = new Date a.seen
          bSeen = new Date b.seen
          if a.seen > b.seen
            return -1
          if b.seen > a.seen
            return 1
          0
        out.out.send state
        do callback
      else
        do callback
