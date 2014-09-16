noflo = require 'noflo'

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

cleanUpUrl = (callback) ->
  regex = new RegExp "(?:\\/)?\\?code=[A-Za-z0-9]+"
  newLoc = window.location.href.replace regex, ''
  if newLoc isnt window.location.href
    window.location.href = newLoc
  do callback
  return

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'user',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'user'
    out: 'user'
    async: true
  , (user, groups, out, callback) ->

    token = groups.pop()
    plan = user.plan?.type or 'free'
    githubToken = user.github?.token or ''
    githubUsername = user.github?.username or ''

    downloadAvatar user.avatar, (err, avatar) ->
      userData =
        'grid-avatar': avatar
        'grid-token': token
        'grid-user': JSON.stringify user
        'github-token': githubToken
        'github-username': githubUsername
        'flowhub-plan': plan

      delete userData['grid-avatar'] unless avatar

      if typeof chrome isnt 'undefined' and chrome.storage
        chrome.storage.sync.set userData, ->
          userData['grid-user'] = user
          out.send userData
          cleanUpUrl callback
        return

      for key, val of userData
        localStorage.setItem key, val

      userData['grid-user'] = user
      out.send userData
      cleanUpUrl callback

  c
