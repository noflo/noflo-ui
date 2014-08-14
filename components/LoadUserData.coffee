noflo = require 'noflo'

validate = (items, callback) ->
  return callback null, items unless items['grid-user']
  try
    items['grid-user'] = JSON.parse items['grid-user']
  catch e
    return callback e
  callback null, items

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'start',
    datatype: 'bang'
  c.outPorts.add 'user', ->
    datatype: 'object'
  c.outPorts.add 'error', ->
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'start'
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
      chrome.storage.sync.get keys, (items) ->
        validate items, (err, valid) ->
          return callback err if err
          out.send valid
          do callback
      return

    items = {}
    for key in keys
      items[key] = localStorage.getItem key
    validate items, (err, valid) ->
      return callback err if err
      out.send valid
      do callback

  c
