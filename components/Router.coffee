noflo = require 'noflo'

class Router extends noflo.Component
  constructor: ->
    @inPorts =
      url: new noflo.ArrayPort 'string'
    @outPorts =
      route: new noflo.ArrayPort 'bang'
      main: new noflo.Port 'string'
      project: new noflo.Port 'string'
      graph: new noflo.Port 'string'
      component: new noflo.Port 'string'
      example: new noflo.Port 'string'
      missed: new noflo.Port 'string'

    @inPorts.url.on 'data', (url) =>
      matched = @matchUrl url
      if @outPorts.route.isAttached()
        @outPorts.route.send matched
        @outPorts.route.disconnect()
      unless matched
        if @outPorts.missed.isAttached()
          @outPorts.missed.send url
          @outPorts.missed.disconnect()
          return

      switch matched.route
        when 'main'
          return unless @outPorts.main.isAttached()
          @outPorts.main.send true
          @outPorts.main.disconnect()
          return
        when 'graph'
          if matched.project and @outPorts.project.isAttached()
            @outPorts.project.send matched.project
            @outPorts.project.disconnect()
          return unless @outPorts.graph.isAttached()
          @outPorts.graph.send graph for graph in matched.graphs
          @outPorts.graph.disconnect()
          return
        when 'component'
          if matched.project and @outPorts.project.isAttached()
            @outPorts.project.send matched.project
            @outPorts.project.disconnect()
          if @outPorts.component.isAttached()
            @outPorts.component.send matched.component
          return
        when 'example'
          return unless @outPorts.example.isAttached()
          @outPorts.example.send matched.graphs[0]
          @outPorts.example.disconnect()

  matchUrl: (url) ->
    routeData =
      route: ''
    if url is ''
      routeData.route = 'main'
      return routeData
    if url.substr(0, 8) is 'project/'
      remainder = url.substr 8
      parts = remainder.split '/'
      routeData.project = parts.shift()
      if parts[0] is 'component' and parts.length is 2
        routeData.route = 'component'
        routeData.component = parts[1]
        return routeData
      routeData.route = 'graph'
      routeData.graph = parts.shift()
      routeData.nodes = parts
      return routeData
    if url.substr(0, 8) is 'example/'
      routeData.route = 'example'
      routeData.graphs = [url.substr(8)]
      return routeData
    return null

exports.getComponent = -> new Router
