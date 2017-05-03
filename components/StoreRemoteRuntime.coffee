noflo = require 'noflo'
registry = require 'flowhub-registry'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: 'user'
    out: 'out'
    async: true
  , (data, groups, out, callback) ->
    unless c.params?.user?['grid-token']
      # User not logged in, persist runtime only locally
      out.send data
      do callback
      return

    data.user = c.params.user['grid-user']?.id
    rt = new registry.Runtime data,
      host: '$NOFLO_REGISTRY_SERVICE'
    rt.register (err) ->
      return callback err if err
      out.send data
      do callback
