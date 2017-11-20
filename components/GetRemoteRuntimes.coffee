noflo = require 'noflo'
registry = require 'flowhub-registry'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'user',
    datatype: 'object'
  c.inPorts.add 'runtimes',
    datatype: 'array'
    required: true
  c.outPorts.add 'runtime',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    params: ['runtimes']
    in: 'user'
    out: 'runtime'
    async: true
  , (data, groups, out, callback) ->
    return callback() unless data['flowhub-token']
    knownRuntimes = c.params.runtimes or []
    registry.list data['flowhub-token'],
      host: '$NOFLO_REGISTRY_SERVICE'
    , (err, runtimes) ->
      return callback err if err
      updateRts = runtimes.filter (rt) ->
        known = null
        for knownRuntime in knownRuntimes
          continue unless knownRuntime.id is rt.runtime.id
          known = knownRuntime
        return true unless known
        knownSeen = new Date known.seen
        if rt.runtime.seen.getTime() is knownSeen.getTime() and rt.runtime.address is known.address and rt.runtime.secret is known.secret
          return false
        true
      return callback() unless updateRts.length
      out.beginGroup '$NOFLO_REGISTRY_SERVICE'
      out.send rt.runtime for rt in updateRts
      out.endGroup()
      do callback
