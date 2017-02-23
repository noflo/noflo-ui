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
    handler = findHandler groups, handled
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

  c.shutdown = ->
    sentTo = null
    sentToIdx = null
    routes = ''

  return c
