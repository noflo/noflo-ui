noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.runtimes = []
  c.inPorts.add 'runtime',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      c.runtimes.push payload
  c.inPorts.add 'send',
    datatype: 'bang'
    process: (event, payload) ->
      return unless event is 'data'
      c.outPorts.runtimes.send c.runtimes
      c.outPorts.runtimes.disconnect()
  c.inPorts.add 'clear',
    datatype: 'bang'
    process: (event, payload) ->
      return unless event is 'data'
      c.runtimes = []

  c.outPorts.add 'runtimes',
    datatype: 'object'

  c
