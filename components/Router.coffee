noflo = require 'noflo'

class Router extends noflo.Component
  constructor: ->
    @inPorts = new noflo.InPorts
      url:
        datatype: 'string'
    @outPorts = new noflo.OutPorts
      route:
        datatype: 'object'
      main:
        datatype: 'bang'
        required: false
      missed:
        datatype: 'string'
        required: false

    @inPorts.url.on 'data', (url) =>
      matched = @matchUrl url
      unless matched
        @outPorts.missed.send url
        @outPorts.missed.disconnect()
        return

      @outPorts.route.send matched
      @outPorts.route.disconnect()

      if matched.route is 'main'
        @outPorts.main.send true
        @outPorts.main.disconnect()

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
