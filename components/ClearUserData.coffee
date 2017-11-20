noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'clear',
    datatype: 'bang'
  c.outPorts.add 'user', ->
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'clear'
    out: 'user'
    async: true
  , (ins, groups, out, callback) ->
    keys = [
      'flowhub-avatar'
      'flowhub-plan'
      'flowhub-theme'
      'flowhub-token'
      'flowhub-user'
      'github-token'
      'github-username'
    ]
    for key in keys
      localStorage.removeItem key
    newUserInfo = {}
    for key in keys
      newUserInfo[key] = null
    out.send newUserInfo
    do callback
