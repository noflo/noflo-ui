noflo = require 'noflo'
uuid = require 'uuid'

iframeAddress = 'https://noflojs.org/noflo-browser/everything.html?fbp_noload=true&fbp_protocol=iframe'

ensureOneIframeRuntime = (runtimes) ->
  for runtime in runtimes
    # Check that we don't have the iframe runtime already
    if runtime.protocol is 'iframe' and runtime.address is iframeAddress
      return null
  iframeRuntime =
    label: 'NoFlo HTML5 environment'
    id: uuid()
    protocol: 'iframe'
    address: iframeAddress
    type: 'noflo-browser'
    seen: Date.now()
  return iframeRuntime

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'array'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'runtimes',
    datatype: 'array'

  noflo.helpers.WirePattern c,
    out: ['out', 'runtimes']
    async: true
    forwardGroups: false
  , (runtimes, groups, out, callback) ->
    runtimes = [] unless runtimes
    iframeRuntime = ensureOneIframeRuntime runtimes
    if iframeRuntime
      # Added iframe runtime
      out.out.send iframeRuntime
      runtimes.push iframeRuntime
    out.runtimes.send runtimes
    do callback
