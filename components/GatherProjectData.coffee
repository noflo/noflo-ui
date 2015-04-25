noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.projects = []
  c.inPorts.add 'project',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      payload.graphs = [] unless payload.graphs
      payload.components = [] unless payload.components
      payload.specs = [] unless payload.specs
      c.projects.push payload
  c.inPorts.add 'graph',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      return unless payload.properties.project
      for project in c.projects
        continue unless payload.properties.project is project.id
        unless project.main
          project.main = payload.properties.id
        if payload.properties.id is project.main
          project.mainGraph = payload
        for g in project.graphs
          return if payload.properties.id is g.properties.id
        project.graphs.push payload
  c.inPorts.add 'component',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      return unless payload.project
      for project in c.projects
        continue unless payload.project is project.id
        for comp, idx in project.components
          if payload.id is comp.id
            project.components[idx] = payload
            return
        project.components.push payload
  c.inPorts.add 'spec',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      return unless payload.project
      for project in c.projects
        continue unless payload.project is project.id
        for comp, idx in project.specs
          if payload.id is comp.id
            project.specs[idx] = payload
            return
        project.specs.push payload
  c.inPorts.add 'send',
    datatype: 'bang'
    process: (event, payload) ->
      return unless event is 'data'
      c.outPorts.projects.send c.projects
      c.outPorts.projects.disconnect()
  c.inPorts.add 'clear',
    datatype: 'bang'
    process: (event, payload) ->
      return unless event is 'data'
      c.projects = []

  c.outPorts.add 'projects',
    datatype: 'object'

  c
