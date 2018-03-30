noflo = require 'noflo'
registry = require 'flowhub-registry'
{ isDefaultRuntime } = require '../src/runtime'

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
    if data.protocol in ['opener', 'microflo']
      # These are transient runtimes, no need to persist on Registry
      out.send data
      do callback
      return
    if isDefaultRuntime data
      # No need to persist the default NoFlo runtime in registry.
      out.send data
      do callback
      return

    unless c.params?.user?['flowhub-token']
      # User not logged in, persist runtime only locally
      out.send data
      do callback
      return

    data.user = c.params.user['flowhub-user']?.id
    data.secret = null unless data.secret
    rt = new registry.Runtime data,
      host: '$NOFLO_REGISTRY_SERVICE'
    rt.register c.params.user['flowhub-token'], (err) ->
      return callback err if err
      out.send data
      do callback
