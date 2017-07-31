noflo = require 'noflo'

sendEvent = (hash) ->
  return unless hash
  return unless typeof window.ga is 'function'
  if hash.indexOf('?') isnt -1
    # Don't send connection details
    hash = hash.split('?')[0]
  window.ga 'set', 'page', "#{window.location.pathname}#{window.location.search}##{hash}"
  window.ga 'send', 'pageview'

buildContext = (url) ->
  routeData =
    route: ''
    subroute: 'open'
    runtime: null
    project: null
    graph: null
    component: null
    nodes: []

  if url is ''
    routeData.route = 'main'
    return routeData

  urlParts = url.split('/').map (part) -> decodeURIComponent part
  route = urlParts.shift()
  switch route
    when 'project'
      # Locally stored project
      routeData.route = 'storage'
      routeData.project = urlParts.shift()
      if urlParts[0] is 'component' and urlParts.length is 2
        # Opening a component from the project
        routeData.component = urlParts[1]
        return routeData
      # Opening a graph from the project
      routeData.graph = urlParts.shift()
      routeData.nodes = urlParts
      return routeData
    when 'example'
      return ctx =
        route: 'redirect'
        url: "gist/#{urlParts.join('/')}"
    when 'gist'
      # Example graph to be fetched from gists
      routeData.route = 'github'
      routeData.subroute = 'gist'
      routeData.graph = urlParts.shift()
      routeData.remote = urlParts
      return routeData
    when 'github'
      # Project to download and open from GitHub
      routeData.route = 'github'
      [owner, repo] = urlParts.splice 0, 2
      routeData.repo = "#{owner}/#{repo}"
      return routeData unless urlParts.length
      if urlParts[0] is 'tree'
        # Opening a particular branch
        urlParts.shift()
        routeData.branch = urlParts.join '/'
        return routeData
      if urlParts[0] is 'blob'
        # Opening a particular file
        urlParts.shift()
        routeData.branch = urlParts.shift()
        if routeData[0] is 'graphs'
          routeData.graph = routeData[1]
        if routeData[0] is 'components'
          routeData.component = routeData[1]
      return routeData
    when 'runtime'
      # Graph running on a remote runtime
      routeData.route = 'runtime'
      routeData.runtime = urlParts.shift()
      routeData.nodes = urlParts
      return routeData

  # No route matched, redirect to main screen
  return ctx =
    route: 'redirect'
    url: ''

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'url',
    datatype: 'string'
  c.outPorts.add 'route',
    datatype: 'object'
  c.outPorts.add 'redirect',
    datatype: 'string'
  c.outPorts.add 'missed',
    datatype: 'bang'

  noflo.helpers.WirePattern c,
    in: 'url'
    out: ['route', 'redirect', 'missed']
    forwardGroups: false
    async: true
  , (url, groups, out, callback) ->
    sendEvent url
    ctx = buildContext url
    unless ctx
      out.missed.send
        payload: ctx
      return callback()

    if ctx.route is 'redirect'
      out.redirect.send "##{ctx.url}"
      return callback()

    out.route.beginGroup ctx.route
    out.route.beginGroup ctx.subroute
    delete ctx.subroute
    out.route.send
      payload: ctx
    out.route.endGroup()
    out.route.endGroup()
    callback()
