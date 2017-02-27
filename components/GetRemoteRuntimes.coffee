noflo = require 'noflo'
registry = require 'flowhub-registry'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'runtime',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'user'
    out: 'runtime'
    async: true
  , (data, groups, out, callback) ->
    return callback() unless data['grid-token']
    registry.list data['grid-token'],
      host: '$NOFLO_REGISTRY_SERVICE'
    , (err, runtimes) ->
      return callback err if err
      out.beginGroup '$NOFLO_REGISTRY_SERVICE'
      out.send rt.runtime for rt in runtimes
      out.endGroup()
      do callback
