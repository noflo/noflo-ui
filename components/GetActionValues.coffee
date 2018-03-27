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
    control: true
  c.outPorts.add 'values',
    datatype: 'all'
    addressable: yes
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'state',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    return if input.attached('keys').length and not input.hasData 'keys'

    data = input.getData 'in'

    if input.hasData 'keys'
      keys = input.getData('keys').split ','
      values = getValues keys, data.state
      for value, idx in values
        output.send
          values: new noflo.IP 'data', value,
            index: idx

    output.sendDone
      state: data.state or {}
      out: data.payload or data
