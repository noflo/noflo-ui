qs = require 'querystring'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'all'
  c.outPorts.add 'pass',
    datatype: 'all'
  c.outPorts.add 'code',
    datatype: 'string'

  noflo.helpers.WirePattern c,
    in: ['in']
    out: ['pass', 'code']
    forwardGroups: true
    async: true
  , (data, groups, out, callback) ->
    if typeof chrome isnt 'undefined' and chrome.identity
      # In Chrome app build we don't perform this step
      out.pass.send data
      return callback()

    # With browser we check the URL for a OAuth grant code
    unless typeof data is 'string'
      out.pass.send data
      return callback()
    [url, query] = data.split '?'
    unless query
      # No query params, pass out as-is
      out.pass.send data
      return callback()
    queryParams = qs.parse query
    unless queryParams.code
      # We don't care about other query parameters
      out.pass.send data
      return callback()
    # Send code for verification
    out.code.send queryParams.code
    return callback()
