noflo = require 'noflo'
octo = require 'octo'

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Get user token from action'
  c.icon = 'key'
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'limit',
    datatype: 'int'
    default: 50
  c.outPorts.add 'token',
    datatype: 'string'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: ['limit']
    out: ['token', 'out']
    async: true
  , (data, groups, out, callback) ->
    token = data.state?.user?['github-token'] or null

    # Check that user has some API calls remaining
    api = octo.api()
    api.token token if token
    request = api.get '/rate_limit'
    request.on 'success', (res) ->
      remaining = res.body.rate?.remaining or 0
      limit = if c.params.limit then parseInt(c.params.limit) else 50
      if remaining < limit
        if token
          callback new Error 'GitHub API access rate limited, try again later'
          return
        callback new Error 'GitHub API access rate limited. Please log in to increase the limit'
        return
      out.token.send token
      out.out.send data.payload
      do callback
    request.on 'error', (err) ->
      error = err.error or err.body
      callback new Error "Failed to communicate with GitHub: #{error}"
    do request
