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
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    out: 'out'
    forwardGroups: false
    async: true
  , (data, groups, out, callback) ->
    switch data.action
      when 'storage:db'
        state = data.state or {}
        state.db = data.payload
        out.send state
        do callback
      when 'storage:opened'
        out.send data.payload
        do callback
      when 'storage:stored:initial'
        state = data.payload

        # Rename graphs list
        state.storedGraphs = state.graphs
        delete state.graphs

        # Ensure consistent order
        state.projects.sort collections.sortByName
        state.storedGraphs.sort collections.sortByName
        state.components.sort collections.sortByName
        state.specs.sort collections.sortByName
        state.runtimes.sort collections.sortBySeen

        # Update project graphs etc
        for project in state.projects
          project.graphs = state.storedGraphs.filter (item) ->
            item.properties.project is project.id
          project.components = state.components.filter (item) ->
            item.project is project.id
          project.specs = state.specs.filter (item) ->
            item.project is project.id

        out.send state
        do callback
      when 'storage:stored:project'
        state = {}
        project = data.payload
        project.graphs = [] unless project.graphs
        if data.state.storedGraphs and not project.graphs.length
          project.graphs = data.state.storedGraphs.filter (item) ->
            item.properties.project is project.id
        project.components = [] unless project.components
        if data.state.components and not project.components.length
          project.components = data.state.components.filter (item) ->
            item.project is project.id
        project.specs = [] unless project.specs
        if data.state.specs and not project.specs.length
          project.specs = data.state.specs.filter (item) ->
            item.project is project.id
        state.projects = data.state.projects or []
        collections.addToList state.projects, project
        out.send state
        do callback
      when 'storage:removed:project'
        state = {}
        state.projects = data.state.projects or []
        collections.removeFromList state.projects,
          id: data.payload
        out.send state
        do callback
      when 'storage:stored:graph'
        state = {}
        state.storedGraphs = data.state.storedGraphs or []
        collections.addToList state.storedGraphs, data.payload
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          out.send state
          do callback
          return
        collections.addToList project.graphs, data.payload
        out.send state
        do callback
      when 'storage:removed:graph'
        state = {}
        state.storedGraphs = data.state.storedGraphs or []
        collections.removeFromList state.storedGraphs,
          properties:
            id: data.payload
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          out.send state
          do callback
          return
        collections.removeFromList project.graphs,
          properties:
            id: data.payload
        out.send state
        do callback
      when 'storage:stored:component'
        state = {}
        state.components = data.state.components or []
        collections.addToList state.components, data.payload
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          out.send state
          do callback
          return
        collections.addToList project.components, data.payload
        out.send state
        do callback
      when 'storage:removed:component'
        state = {}
        state.components = data.state.components or []
        collections.removeFromList state.components,
          id: data.payload
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          out.send state
          do callback
          return
        collections.removeFromList project.components,
          id: data.payload
        out.send state
        do callback
      when 'storage:stored:spec'
        state = {}
        state.specs = data.state.specs or []
        collections.addToList state.specs, data.payload
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          out.send state
          do callback
          return
        collections.addToList project.specs, data.payload
        out.send state
        do callback
      when 'storage:removed:spec'
        state = {}
        state.specs = data.state.specs or []
        collections.removeFromList state.specs,
          id: data.payload
        state.projects = data.state.projects or []
        project = findProject data.payload, state.projects
        unless project
          out.send state
          do callback
          return
        collections.removeFromList project.specs,
          id: data.payload
        out.send state
        do callback
      when 'storage:stored:runtime'
        state = {}
        state.runtimes = data.state.runtimes or []
        collections.addToList state.runtimes, data.payload, collections.sortBySeen
        out.send state
        do callback
      when 'storage:removed:runtime'
        state = {}
        state.runtimes = data.state.runtimes or []
        collections.removeFromList state.runtimes,
          id: data.payload
        out.send state
        do callback
      when 'storage:error'
        state =
          state: 'error'
          error: data.payload
        out.send state
        do callback
      else
        do callback
