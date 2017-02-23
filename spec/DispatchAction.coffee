noflo = require 'noflo'
unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'DispatchAction component', ->
  c = null
  routes = null
  ins = null
  pass = null
  handle = []

  before (done) ->
    loader = new noflo.ComponentLoader baseDir
    loader.load 'ui/DispatchAction', (err, instance) ->
      return done err if err
      c = instance
      routes = noflo.internalSocket.createSocket()
      c.inPorts.routes.attach routes
      ins = noflo.internalSocket.createSocket()
      c.inPorts.in.attach ins
      done()
  beforeEach ->
    pass = noflo.internalSocket.createSocket()
    c.outPorts.pass.attach pass
    for idx in [0..5]
      handler = noflo.internalSocket.createSocket()
      c.outPorts.handle.attach handler, idx
      handle.push handler
  afterEach ->
    c.outPorts.pass.detach pass
    pass = null
    for handler, idx in handle
      c.outPorts.handle.detach handler, idx
    handle = []
    c.shutdown()

  sendAction = (action, payload, state) ->
    parts = action.split ':'
    ins.beginGroup part for part in parts
    ins.send
      action: action
      payload: payload
      state: state
    ins.endGroup() for part in parts

  describe 'receiving a unhandled action', ->
    it 'should send it to PASS', (done) ->
      routes.send 'foo:bar'
      expected =
        payload: [1, 2]
        state:
          hello: 'world'
      pass.on 'data', (data) ->
        chai.expect(data.payload).to.equal expected.payload
        chai.expect(data.state).to.equal expected.state
        done()
      sendAction 'foo:baz', expected.payload, expected.state
  describe 'receiving a handled action', ->
    it 'should send it to correct handler', (done) ->
      routes.send 'foo:bar,foo:baz'
      expected =
        payload: [1, 2]
        state:
          hello: 'world'
      pass.on 'data', (data) ->
        done new Error 'Received pass'
      handle[1].on 'data', (data) ->
        chai.expect(data.payload).to.equal expected.payload
        chai.expect(data.state).to.equal expected.state
        done()
      sendAction 'foo:baz', expected.payload, expected.state
  describe 'receiving a handled wildcard action', ->
    it 'should send it to correct handler', (done) ->
      routes.send 'bar:baz,foo:*'
      expected =
        payload: [1, 2]
        state:
          hello: 'world'
      pass.on 'data', (data) ->
        done new Error 'Received pass'
      handle[1].on 'data', (data) ->
        chai.expect(data.payload).to.equal expected.payload
        chai.expect(data.state).to.equal expected.state
        done()
      sendAction 'foo:baz', expected.payload, expected.state
