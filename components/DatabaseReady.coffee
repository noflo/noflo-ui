noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'bang'
    process: (event, payload) ->
      return unless event is 'data'
      window.nofloDBReady = true
  c
