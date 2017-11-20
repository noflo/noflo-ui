noflo = require 'noflo'
urlParser = require 'url'

downloadAvatar = (avatarUrl, callback) ->
  return callback null, null unless avatarUrl

  req = new XMLHttpRequest
  fileReader = new FileReader
  req.open 'GET', avatarUrl, true
  req.responseType = 'blob'
  req.onload = (e) ->
    if req.status isnt 200
      return callback new Error "Avatar request returned #{req.status}"
    fileReader.onload = (event) ->
      callback null, event.target.result
    fileReader.readAsDataURL req.response
  req.onerror = ->
    callback new Error 'Avatar request failed'
  req.send()

cleanUpUrl = (out, callback) ->
  url = urlParser.parse window.location.href
  # Clear query params, if any
  delete url.search
  newUrl = urlParser.format url
  return callback() if newUrl is url
  if window.history?.replaceState
    # We can manipulate URL without reloading page
    window.history.replaceState {}, 'clear', url.pathname
    return callback()
  # Old-school redirect
  out.send newUrl
  do callback
  return

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'redirect',
    datatype: 'string'

  noflo.helpers.WirePattern c,
    in: 'user'
    out: ['user', 'redirect']
    async: true
  , (user, groups, out, callback) ->

    plan = user.plan?.type or 'free'
    githubToken = user.github?.token or ''
    githubUsername = user.github?.username or ''

    downloadAvatar user.avatar, (err, avatar) ->
      userData =
        'flowhub-avatar': avatar
        'flowhub-plan': plan
        'flowhub-token': githubToken
        'flowhub-user': JSON.stringify user
        'github-token': githubToken
        'github-username': githubUsername

      delete userData['flowhub-avatar'] unless avatar

      for key, val of userData
        localStorage.setItem key, val

      userData['flowhub-user'] = user
      out.user.send userData
      cleanUpUrl out.redirect, callback
