noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Get user token from action'
  c.icon = 'key'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'token',
    datatype: 'string'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['token', 'out']
    async: true
  , (data, groups, out, callback) ->
    unless data.state?.user?['github-token']
      return callback new Error "GitHub operations require logging in"
    out.token.send data.state.user['github-token']
    out.out.send data.payload
    do callback
