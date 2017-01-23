qs = require 'querystring'
noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'all'
  c.outPorts.add 'pass',
    datatype: 'all'
  c.outPorts.add 'code',
    datatype: 'string'
  c.outPorts.add 'error',
    datatype: 'string'

  noflo.helpers.WirePattern c,
    in: ['in']
    out: ['pass', 'code']
    forwardGroups: true
    async: true
  , (data, groups, out, callback) ->
    # Check the URL for a OAuth grant code
    unless typeof data is 'string'
      return callback new Error 'URL must be a string'
    [url, query] = data.split '?'
    unless query
      # No query params, pass out as-is
      out.pass.send data
      return callback()
    queryParams = qs.parse query
    if queryParams.error and queryParams.error_description
      callback new Error queryParams.error_description
    unless queryParams.code
      # We don't care about other query parameters
      out.pass.send data
      return callback()
    # Send code for verification
    out.code.send queryParams.code
    return callback()
