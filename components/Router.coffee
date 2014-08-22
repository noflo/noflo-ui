noflo = require 'noflo'

normalize = (parts) ->
  parts.map (part) -> decodeURIComponent part

buildContext = (url) ->
  routeData =
    route: ''
    runtime: null
    project: null
    graph: null
    component: null
    nodes: []

  if url is ''
    routeData.route = 'main'
    return routeData

  if url.substr(0, 8) is 'project/'
    # Locally stored project
    routeData.route = 'project'
    remainder = url.substr 8
    parts = normalize remainder.split '/'
    routeData.project = parts.shift()

    if parts[0] is 'component' and parts.length is 2
      routeData.component = parts[1]
      return routeData

    routeData.graph = parts.shift()
    routeData.nodes = parts
    return routeData

  if url.substr(0, 8) is 'example/'
    # Remote example
    remainder = url.substr 8
    parts = normalize remainder.split '/'
    routeData.route = 'github'
    routeData.graph = parts.shift()
    routeData.remote = parts
    return routeData

  if url.substr(0, 8) is 'runtime/'
    # Graph running on a remote runtime
    remainder = url.substr 8
    parts = normalize remainder.split '/'
    routeData.route = 'runtime'
    routeData.runtime = parts.shift()
    routeData.nodes = parts
    return routeData

  return null

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'url',
    datatype: 'string'
  c.outPorts.add 'route',
    datatype: 'object'
  c.outPorts.add 'missed',
    datatype: 'bang'

  noflo.helpers.WirePattern c,
    in: 'url'
    out: 'route'
    forwardGroups: false
  , (url, groups, out) ->
    ctx = buildContext url
    unless ctx
      c.outPorts.missed.send ctx
      c.outPorts.missed.disconnect()
      return

    out.beginGroup ctx.route
    out.beginGroup 'open'
    out.send ctx
    out.endGroup()
    out.endGroup()

  c
