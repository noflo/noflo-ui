noflo = require 'noflo'
registry = require 'flowhub-registry'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'user',
    datatype: 'object'
    required: true
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
    unless c.params?.user?['flowhub-token']
      # User not logged in, persist runtime only locally
      out.send data
      do callback
      return

    rt = new registry.Runtime data,
      host: '$NOFLO_REGISTRY_SERVICE'
    rt.del c.params.user['flowhub-token'], (err) ->
      return callback err if err
      out.send data
      do callback

