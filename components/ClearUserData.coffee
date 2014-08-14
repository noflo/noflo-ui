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
      'grid-avatar'
      'grid-token'
      'grid-user'
      'github-token'
      'github-username'
      'flowhub-plan'
      'flowhub-theme'
    ]
    if typeof chrome isnt 'undefined' and chrome.storage
      chrome.storage.sync.remove keys, ->
        out.send {}
        do callback
      return

    for key in keys
      localStorage.removeItem key
    out.send {}
    do callback

  c
