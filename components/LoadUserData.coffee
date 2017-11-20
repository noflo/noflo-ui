noflo = require 'noflo'

validate = (items, callback) ->
  return callback null, items unless items['flowhub-user']
  try
    items['flowhub-user'] = JSON.parse items['flowhub-user']
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
    # Handle obsolete keys
    deprecated =
      'grid-avatar': 'flowhub-avatar'
      'grid-token': 'flowhub-token'
      'grid-user': 'flowhub-user'
    for key, newKey of deprecated
      val = localStorage.getItem key
      continue unless val
      localStorage.setItem newKey, val
      localStorage.removeItem key

    keys = [
      'flowhub-avatar'
      'flowhub-plan'
      'flowhub-theme'
      'flowhub-token'
      'flowhub-user'
      'github-token'
      'github-username'
    ]
    items = {}
    for key in keys
      items[key] = localStorage.getItem key

    validate items, (err, valid) ->
      return callback err if err
      out.send valid
      do callback
