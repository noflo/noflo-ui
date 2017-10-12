noflo = require 'noflo'

findHandler = (actionParts, routes) ->
  normalized = routes.map (route) ->
    if route.indexOf('*') is -1
      # No wildcards here
      return route
    routeParts = route.split ':'
    for part, idx in routeParts
      continue unless part is '*'
      continue unless actionParts[idx]
      routeParts[idx] = actionParts[idx]
    return routeParts.join ':'
  return normalized.indexOf actionParts.join(':')

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
  c.outPorts.add 'handling',
    datatype: 'integer'

  routes = ''
  c.inPorts.routes.on 'data', (data) ->
    routes = data

  sentTo = null
  sentToIdx = null
  c.inPorts.in.on 'data', (data) ->
    handled = routes.split ','
    handler = findHandler data.action.split(':'), handled
    if handler is -1
      sentTo = c.outPorts.pass
    else
      c.outPorts.handling.send handler
      sentTo = c.outPorts.handle
      sentToIdx = handler
    sentTo.send data, sentToIdx
  c.inPorts.in.on 'disconnect', ->
    return unless sentTo
    sentTo.disconnect sentToIdx
    sentTo = null
    sentToIdx = null

  c.shutdown = ->
    sentTo = null
    sentToIdx = null
    routes = ''

  return c
