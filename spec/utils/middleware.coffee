debugOpenBracket = (data) ->
  console.log "< #{data.id} #{data.group}"
debugData = (data) ->
  console.log "DATA #{data.id}"
debugCloseBracket = (data) ->
  console.log "> #{data.id} #{data.group}"

class Middleware
  instance: null
  actionIn: null
  newAction: null
  passAction: null
  debug: false

  constructor: (@component, @baseDir) ->

  before: (callback) ->
    loader = new noflo.ComponentLoader @baseDir
    loader.load @component, (err, instance) =>
      return callback err if err
      instance.once 'ready', =>
        @instance = instance
        @actionIn = noflo.internalSocket.createSocket()
        @instance.inPorts.in.attach @actionIn
        @actionIn.port = 'in'
        @instance.start()
        @instance.network.once 'start', ->
          callback null

  beforeEach: ->
    @passAction = noflo.internalSocket.createSocket()
    @instance.outPorts.pass.attach @passAction
    @passAction.port = 'pass'
    @newAction = noflo.internalSocket.createSocket()
    @instance.outPorts.new.attach @newAction
    @newAction.port = 'new'

  afterEach: ->
    @instance.outPorts.pass.detach @passAction
    @instance.outPorts.new.detach @newAction

  enableDebug: ->
    return if @debug
    @instance.network.on 'begingroup', debugOpenBracket
    @instance.network.on 'data', debugData
    @instance.network.on 'endgroup', debugCloseBracket
    @debug = true
  disableDebug: ->
    return unless @debug
    @instance.network.removeListener 'begingroup', debugOpenBracket
    @instance.network.removeListener 'data', debugData
    @instance.network.removeListener 'endgroup', debugCloseBracket
    @debug = false

  send: (action, payload, state) ->
    actionParts = action.split ':'
    @actionIn.beginGroup part for part in actionParts
    @actionIn.send
      payload: payload
      state: state
    @actionIn.endGroup part for part in actionParts

  receive: (socket, expected, check, done) ->
    received = []
    onBeginGroup = (group) ->
      received.push "< #{group}"
    onData = (data) ->
      received.push 'DATA'
      check data
    onEndGroup = (group) ->
      received.push "> #{group}"
      return unless received.length >= expected.length
      socket.removeListener 'begingroup', onBeginGroup
      socket.removeListener 'data', onData
      socket.removeListener 'endgroup', onEndGroup
      chai.expect(received).to.eql expected
      done()
    socket.on 'begingroup', onBeginGroup
    socket.on 'data', onData
    socket.on 'endgroup', onEndGroup

  receiveAction: (action, check, done) ->
    expected = []
    actionParts = action.split ':'
    expected.push "< #{part}" for part in actionParts
    expected.push 'DATA'
    actionParts.reverse()
    expected.push "> #{part}" for part in actionParts
    @receive @newAction, expected, check, done

  receivePass: (action, payload, done) ->
    check = (data) ->
      # Strict equality check for passed packets
      chai.expect(data.payload).to.equal payload
    expected = []
    actionParts = action.split ':'
    expected.push "< #{part}" for part in actionParts
    expected.push 'DATA'
    actionParts.reverse()
    expected.push "> #{part}" for part in actionParts
    @receive @passAction, expected, check, done

window.middleware = (component, baseDir) ->
  return new Middleware component, baseDir
