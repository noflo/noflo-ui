noflo = require 'noflo'

randomString = (num) ->
  unless num?
    num = 60466176 # 36^5
  num = Math.floor( Math.random() * num )
  num.toString 36

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: 'out'
  , (data, groups, out) ->
    if data.properties
      # Graph
      if data.properties.id
        # We already have an ID
        data.id = data.properties.id
        out.send data
        return
      id = randomString()
      data.properties.id = id
      data.id = id
      out.send data

    # Other types
    if data.id
      out.send data
      return
    data.id = randomString()
    out.send data

  c
