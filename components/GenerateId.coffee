noflo = require 'noflo'

class GenerateId extends noflo.Component
  constructor: ->
    @inPorts =
      start: new noflo.Port 'object'
    @outPorts =
      out: new noflo.Port 'string'

    @inPorts.start.on 'data', (data) =>
      id = @randomString()
      id = data.id if data.id
      id = data.properties.id if data.properties and data.properties.id
      @outPorts.out.send id
      @outPorts.out.disconnect()

  randomString: (num) ->
    unless num?
      num = 60466176 # 36^5
    num = Math.floor( Math.random() * num )
    num.toString 36

exports.getComponent = -> new GenerateId
