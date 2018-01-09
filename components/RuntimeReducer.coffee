noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.icon = 'cogs'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.process (input, output) ->
