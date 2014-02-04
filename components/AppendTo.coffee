noflo = require 'noflo'

class AppendTo extends noflo.Component
  constructor: ->
    @arr = null
    @val = null
    @inPorts =
      append: new noflo.Port 'all'
      to: new noflo.Port 'array'
    @outPorts =
      out: new noflo.Port 'array'

    @inPorts.append.on 'data', (@val) =>
      do @appendTo
    @inPorts.to.on 'data', (@arr) =>
      do @appendTo

  appendTo: ->
    return unless @arr and @val
    @arr.push @val
    @val = null
    return unless @outPorts.out.isAttached()
    @outPorts.out.send @arr
    @outPorts.out.disconnect()

exports.getComponent = -> new AppendTo
