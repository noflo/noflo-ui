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
  c.icon = 'code-fork'
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
  c.forwardBrackets = {}
  c.process (input, output) ->
    return unless input.hasData 'routes', 'in'
    [routes, data] = input.getData 'routes', 'in'
    unless data?.action
      output.sendDone
        pass: data
      return
    handled = routes.split ','
    handler = findHandler data.action.split(':'), handled
    if handler is -1
      output.sendDone
        pass: data
      return
    output.send
      handling: handler
      handle: new noflo.IP 'data', data,
        index: handler
    output.done()
