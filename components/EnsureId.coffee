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
  c.outPorts.add 'id',
    datatype: 'string'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['out', 'id']
    async: true
  , (data, groups, out, callback) ->
    if data.properties
      # Graph
      if data.properties.id
        # We already have an ID
        data.id = data.properties.id
        out.out.send data
        out.id.send data.id
        do callback
        return
      id = randomString()
      data.properties.id = id
      data.id = id
      out.out.send data
      out.id.send data.id
      do callback
      return

    # Other types
    if data.id
      out.out.send data
      out.id.send data.id
      do callback
      return
    data.id = randomString()
    out.out.send data
    out.id.send data.id
    do callback
