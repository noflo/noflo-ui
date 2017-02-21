noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'Runtime Middleware', ->
  c = null
  actionIn = null
  passAction = null
  newAction = null
  runtime = null
  before (done) ->
    @timeout 4000
    fixtures = document.getElementById 'fixtures'
    transport = require('fbp-protocol-client').getTransport 'iframe'
    runtime = new transport
      address: 'mockruntime.html'
    runtime.setParentElement fixtures
    window.runtime = runtime

    loader = new noflo.ComponentLoader baseDir
    loader.load 'ui/RuntimeMiddleware', (err, instance) ->
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
    runtime.iframe.contentWindow.clearMessages()

  # Set up a fake runtime connection and test that we can play both ends
  it 'should be able to connect', (done) ->
    capabilities = [
      'protocol:graph'
      'protocol:component'
      'protocol:network'
      'protocol:runtime'
    ]
    runtime.connect()
    runtime.once 'capabilities', (rtCapabilities) ->
      chai.expect(rtCapabilities).to.eql capabilities
      done()
    runtime.iframe.addEventListener 'load', ->
      setTimeout ->
        runtime.iframe.contentWindow.handleProtocolMessage (msg, send) ->
          chai.expect(msg.protocol).to.equal 'runtime'
          chai.expect(msg.command).to.equal 'getruntime'
          send 'runtime', 'runtime',
            capabilities: capabilities
      , 100

  describe 'receiving a runtime:connected action', ->
    it 'should pass it out as-is', (done) ->
      action = 'runtime:connected'
      payload = runtime
      middleware.receivePass passAction, action, payload, done
      middleware.send actionIn, action, payload
  describe 'receiving a context:edges action', ->
    it 'should send selected edges to the runtime', (done) ->
      sentEdges = [
        from:
          node: 'Foo'
          port: 'out'
        to:
          node: 'Bar'
          port: 'in'
      ]
      expectedEdges = [
        src:
          node: 'Foo'
          port: 'out'
        tgt:
          node: 'Bar'
          port: 'in'
      ]
      middleware.send actionIn, 'context:edges', sentEdges,
        graphs: [
          name: 'foo'
        ]
        runtime: runtime
      runtime.iframe.contentWindow.handleProtocolMessage (msg) ->
        chai.expect(msg.protocol).to.equal 'network'
        chai.expect(msg.command).to.equal 'edges'
        chai.expect(msg.payload.graph).to.equal 'foo'
        chai.expect(msg.payload.edges).to.eql expectedEdges
        done()
