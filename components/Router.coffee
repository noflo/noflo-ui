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

      route = matched.shift()
      switch route
        when 'main'
          return unless @outPorts.main.isAttached()
          @outPorts.main.send true
          @outPorts.main.disconnect()
          return
        when 'sketch'
          return unless @outPorts.graph.isAttached()
          @outPorts.graph.send matched[0]
          @outPorts.graph.disconnect()
          return
        when 'graph', 'component'
          project = matched.shift()
          if @outPorts.project.isAttached()
            @outPorts.project.send project
            @outPorts.project.disconnect()
          if route is 'graph' and @outPorts.graph.isAttached()
            for graph in matched
              @outPorts.graph.send graph
            @outPorts.graph.disconnect()
          if route is 'component' and @outPorts.component.isAttached()
            @outPorts.component.send matched[0]
          return
        when 'example'
          return unless @outPorts.example.isAttached()
          @outPorts.example.send matched[0]
          @outPorts.example.disconnect()

  matchUrl: (url) ->
    if url is ''
      return ['main']
    if url.substr(0, 8) is 'project/'
      remainder = url.substr 8
      parts = remainder.split '/'
      project = parts.shift()
      if parts[0] is 'component' and parts.length is 2
        return ['component', project, parts[1]]
      graph = ['graph', project]
      graph.push part for part in parts
      return graph
    if url.substr(0, 6) is 'graph/'
      return ['sketch', url.substr(6)]
    if url.substr(0, 8) is 'example/'
      return ['example', url.substr(8)]
    return null

exports.getComponent = -> new Router
