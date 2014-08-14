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
  req.send()

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
      return callback err if err

      userData =
        'grid-avatar': avatar
        'grid-token': token
        'grid-user': JSON.stringify user
        'github-token': githubToken
        'github-username': githubUsername
        'flowhub-plan': plan

      if typeof chrome isnt 'undefined' and chrome.storage
        chrome.storage.sync.set userData, ->
          userData['grid-user'] = user
          out.send userData
          do callback
        return

      for key, val of userData
        localStorage.setItem key, val

      userData['grid-user'] = user
      out.send userData
      do callback

  c
