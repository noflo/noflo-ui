noflo = require 'noflo'

getValues = (keys, state) ->
  values = keys.map (key) ->
    return state[key] if key.indexOf('[') is -1
    matched = key.match /(.*)\[([0-9]+|last)\]/
    return null unless matched
    arr = state[matched[1]]
    if matched[2] is 'last'
      return arr[arr.length - 1]
    arr[matched[2]]
  return values

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Reads requested keys from action and sends them out alongside the action payload'
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'keys',
    datatype: 'string'
  c.outPorts.add 'values',
    datatype: 'all'
    addressable: yes
  c.outPorts.add 'out',
    datatype: 'object'
  noflo.helpers.WirePattern c,
    in: 'in'
    params: 'keys'
    out: 'out'
    async: true
    forwardGroups: true
  , (data, groups, out, callback) ->
    if not c.params.keys or not data.state or not data.payload
      out.send data.payload or data
      do callback
      return
    keys = c.params.keys.split ','
    values = getValues keys, data.state
    for value, idx in values
      c.outPorts.values.send value, idx
    out.send data.payload
    do callback
