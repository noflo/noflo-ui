noflo = require 'noflo'

class GenerateId extends noflo.Component
  constructor: ->
    @inPorts =
      start: new noflo.Port 'bang'
    @outPorts =
      out: new noflo.Port 'string'

    @inPorts.start.on 'data', =>
      @outPorts.out.send @randomString()
      @outPorts.out.disconnect()

  randomString: (num) ->
    unless num?
      num = 60466176 # 36^5
    num = Math.floor( Math.random() * num )
    num.toString 36

exports.getComponent = -> new GenerateId
