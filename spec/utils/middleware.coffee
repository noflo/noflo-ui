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

  attachAndStart: (instance, callback) ->
    @instance = instance
    @actionIn = noflo.internalSocket.createSocket()
    @instance.inPorts.in.attach @actionIn
    @actionIn.port = 'in'
    @instance.start()
    @instance.network.once 'start', ->
      callback null

  before: (callback) ->
    loader = new noflo.ComponentLoader @baseDir
    loader.load @component, (err, instance) =>
      return callback err if err
      if instance.isReady()
        @attachAndStart instance, callback
        return
      instance.once 'ready', =>
        @attachAndStart instance, callback

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
    @actionIn.send
      action: action
      payload: payload
      state: state

  receive: (socket, expected, check, done) ->
    received = []
    onData = (data) ->
      received.push "#{data.action} DATA"
      check data.payload
      return unless received.length >= expected.length
      socket.removeListener 'data', onData
      chai.expect(received).to.eql expected
      done()
    socket.on 'data', onData

  receiveAction: (action, check, done) ->
    expected = []
    expected.push "#{action} DATA"
    @receive @newAction, expected, check, done

  receivePass: (action, payload, done) ->
    check = (data) ->
      # Strict equality check for passed packets
      chai.expect(data).to.equal payload
    expected = []
    expected.push "#{action} DATA"
    @receive @passAction, expected, check, done

window.middleware = (component, baseDir) ->
  return new Middleware component, baseDir
