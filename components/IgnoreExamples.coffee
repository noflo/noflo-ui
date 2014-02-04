noflo = require 'noflo'

class IgnoreExamples extends noflo.Component
  constructor: ->
    @inPorts =
      in: new noflo.Port 'object'
    @outPorts =
      out: new noflo.Port 'object'

    @inPorts.in.on 'data', (data) =>
      # Ignore examples
      return if window.location.hash.substr(1, 8) is 'example/'
      @outPorts.out.send data
    @inPorts.in.on 'disconnect', =>
      @outPorts.out.disconnect()

exports.getComponent = -> new IgnoreExamples
