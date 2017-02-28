noflo = require 'noflo'

matchUrl = (url) ->
  if url is ''
    routeData =
      action: 'workspace:main'
      payload:
        project: null
        runtime: null
    return routeData

  urlParts = url.split('/').map (part) -> decodeURIComponent part
  route = urlParts.shift()
  switch route
    when 'project'
      routeData =
        action: 'workspace:project'
        payload: {}
      # Locally stored project
      routeData.payload.project = urlParts.shift()
      if urlParts[0] is 'component' and urlParts.length is 2
        # Opening a component from the project
        routeData.payload.component = urlParts[1]
        return routeData
      # Opening a graph from the project
      routeData.payload.graph = urlParts.shift()
      routeData.payload.nodes = urlParts
      return routeData
    when 'runtime'
      # Live mode with remote runtime
      routeData =
        action: 'workspace:runtime'
        payload: {}
      routeData.payload.runtime = urlParts.shift()
      routeData.payload.nodes = urlParts
      return routeData
    when 'example'
      # Redirect old example URLs to gists
      routeData =
        action: 'application:hash'
        payload: ['gist'].concat urlParts
      return routeData
    when 'gist'
      # Example graph to be fetched from gists
      routeData =
        action: 'github:gist'
        payload:
          gist: urlParts.shift()
      return routeData
    when 'github'
      # Project to download and open from GitHub
      routeData =
        action: 'github:download'
        payload: {}
      [owner, repo] = urlParts.splice 0, 2
      routeData.payload.repo = "#{owner}/#{repo}"
      return routeData unless urlParts.length
      if urlParts[0] is 'tree'
        # Opening a particular branch
        urlParts.shift()
        routeData.payload.branch = urlParts.join '/'
        return routeData
      if urlParts[0] is 'blob'
        # Opening a particular file
        urlParts.shift()
        routeData.payload.branch = urlParts.shift()
        if routeData[0] is 'graphs'
          routeData.payload.graph = routeData[1]
        if routeData[0] is 'components'
          routeData.payload.component = routeData[1]
      return routeData

  # No route matched
  return null

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'url',
    datatype: 'string'
  c.outPorts.add 'action',
    datatype: 'string'
  c.outPorts.add 'payload',
    datatype: 'object'
  c.outPorts.add 'missed',
    datatype: 'string'

  noflo.helpers.WirePattern c,
    in: 'url'
    out: ['action', 'payload', 'missed']
    forwardGroups: false
    async: true
  , (url, groups, out, callback) ->
    matched = matchUrl url
    unless matched
      out.missed.send url
      return callback()

    out.action.send matched.action
    out.payload.send matched.payload
    callback()
