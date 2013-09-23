noflo = require 'noflo'

class Router extends noflo.Component
  constructor: ->
    @inPorts =
      url: new noflo.Port 'string'
    @outPorts =
      main: new noflo.Port 'string'
      new: new noflo.Port 'string'
      graph: new noflo.Port 'string'
      example: new noflo.Port 'string'
      missed: new noflo.Port 'string'

    @inPorts.url.on 'data', (url) =>
      if url is ''
        @outPorts.main.send url
        @outPorts.main.disconnect()
        return

      if url is 'new'
        @outPorts.new.send url
        @outPorts.new.disconnect()
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
