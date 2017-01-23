noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'routes',
    datatype: 'string'
    required: true
    control: true
  c.inPorts.add 'in',
    datatype: 'all'
  c.outPorts.add 'pass',
    datatype: 'all'
  c.outPorts.add 'handle',
    datatype: 'all'
    addressable: true

  routes = ''
  c.inPorts.routes.on 'data', (data) ->
    routes = data

  groups = []
  sentTo = null
  sentToIdx = null
  c.inPorts.in.on 'begingroup', (group) ->
    groups.push group
  c.inPorts.in.on 'data', (data) ->
    handled = routes.split ','
    groupString = groups.join ':'
    handler = handled.indexOf groupString
    if handler is -1
      sentTo = c.outPorts.pass
    else
      sentTo = c.outPorts.handle
      sentToIdx = handler
    sentTo.beginGroup grp, sentToIdx for grp in groups
    sentTo.send data, sentToIdx
    sentTo.endGroup sentToIdx for grp in groups
  c.inPorts.in.on 'endgroup', (group) ->
    grp = groups.pop()
  c.inPorts.in.on 'disconnect', ->
    return unless sentTo
    sentTo.disconnect sentToIdx
    sentTo = null
    sentToIdx = null

  return c
