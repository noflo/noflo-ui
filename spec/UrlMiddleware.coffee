noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'URL Middleware', ->
  c = null
  actionIn = null
  passAction = null
  newAction = null
  before (done) ->
    @timeout 4000
    loader = new noflo.ComponentLoader baseDir
    loader.load 'ui/UrlMiddleware', (err, instance) ->
      return done err if err
      c = instance
      actionIn = noflo.internalSocket.createSocket()
      c.inPorts.in.attach actionIn
      actionIn.port = 'in'
      c.start()
      c.network.once 'start', ->
        done()
  beforeEach ->
    passAction = noflo.internalSocket.createSocket()
    c.outPorts.pass.attach passAction
    passAction.port = 'pass'
    newAction = noflo.internalSocket.createSocket()
    c.outPorts.new.attach newAction
    newAction.port = 'new'
  afterEach ->
    c.outPorts.pass.detach passAction
    c.outPorts.new.detach newAction
  after ->
    window.location.hash = ''

  send = (socket, action, payload, state) ->
    actionParts = action.split ':'
    socket.beginGroup part for part in actionParts
    socket.send
      payload: payload
      state: state
    socket.endGroup part for part in actionParts
    
  receive = (socket, expected, check, done) ->
    received = []
    onBeginGroup = (group) ->
      received.push "< #{group}"
    onData = (data) ->
      received.push 'DATA'
      check data.payload
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

  receiveAction = (socket, action, check, done) ->
    expected = []
    actionParts = action.split ':'
    expected.push "< #{part}" for part in actionParts
    expected.push 'DATA'
    actionParts.reverse()
    expected.push "> #{part}" for part in actionParts
    receive socket, expected, check, done

  receivePass = (socket, action, payload, done) ->
    check = (data) ->
      # Strict equality check for passed packets
      chai.expect(data).to.equal payload
    receiveAction socket, action, check, done

  describe 'receiving a runtime:connect action', ->
    it 'should pass it out as-is', (done) ->
      action = 'runtime:connect'
      payload =
        hello: 'world'
      receivePass passAction, action, payload, done
      send actionIn, action, payload
  describe 'receiving a user:login action', ->
    it 'should pass it out as-is', (done) ->
      action = 'user:login'
      payload =
        url: window.location.href
        scopes: []
      receivePass passAction, action, payload, done
      send actionIn, action, payload
  describe 'receiving a noflo:ready action', ->
    it 'should send application:url and main:open actions', (done) ->
      checkUrl = (data) ->
        chai.expect(data).to.equal window.location.href
      checkOpen = (data) ->
        chai.expect(data).to.eql
          route: 'main'
          runtime: null
          project: null
          graph: null
          component: null
          nodes: []
      receiveAction newAction, 'application:url', checkUrl, ->
        receiveAction newAction, 'main:open', checkOpen, done
      send actionIn, 'noflo:ready', true
  describe 'on hash change to a project URL', ->
    it 'should send project:open action', (done) ->
      checkOpen = (data) ->
        chai.expect(data).to.eql
          route: 'project'
          runtime: null
          project: 'noflo-ui'
          graph: 'noflo-ui_graphs_main'
          component: null
          nodes: [
            'UserStorage'
          ]
      receiveAction newAction, 'project:open', checkOpen, done
      window.location.hash = '#project/noflo-ui/noflo-ui_graphs_main/UserStorage'
  describe 'on hash change to a old-style example URL', ->
    it 'should send application:redirect action', (done) ->
      checkRedirect = (data) ->
        chai.expect(data).to.eql '#gist/abc123'
      receiveAction newAction, 'application:redirect', checkRedirect, done
      window.location.hash = '#example/abc123'
  describe 'on hash change to an gist URL', ->
    it 'should send github:gist action', (done) ->
      checkOpen = (data) ->
        chai.expect(data).to.eql
          route: 'github'
          runtime: null
          project: null
          graph: 'abc123'
          component: null
          nodes: []
          remote: []
      receiveAction newAction, 'github:gist', checkOpen, done
      window.location.hash = '#gist/abc123'
