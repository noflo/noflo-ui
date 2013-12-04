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
      example: new noflo.Port 'string'
      missed: new noflo.Port 'string'

    @inPorts.url.on 'data', (url) =>
      if @outPorts.route.isAttached()
        @outPorts.route.send true
        @outPorts.route.disconnect()

      if url is ''
        @outPorts.main.send url
        @outPorts.main.disconnect()
        return

      if url.substr(0, 8) is 'project/'
        remainder = url.substr 8
        parts = remainder.split '/'
        @outPorts.project.send parts.shift()
        @outPorts.project.disconnect()
        for part in parts
          @outPorts.graph.send part
        @outPorts.graph.disconnect()
        return

      if url.substr(0, 6) is 'graph/'
        @outPorts.graph.send url.substr 6
        @outPorts.graph.disconnect()
        return

      if url.substr(0, 8) is 'example/'
        @outPorts.example.send url.substr 8
        @outPorts.example.disconnect()
        return

      if @outPorts.missed.isAttached()
        @outPorts.missed.send url
        @outPorts.missed.disconnect()

exports.getComponent = -> new Router
