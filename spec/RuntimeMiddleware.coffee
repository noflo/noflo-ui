noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'Runtime Middleware', ->
  runtime = null
  before (done) ->
    fixtures = document.getElementById 'fixtures'
    transport = require('fbp-protocol-client').getTransport 'iframe'
    runtime = new transport
      address: 'mockruntime.html'
    runtime.setParentElement fixtures
    window.runtime = runtime
    done()

  afterEach ->
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
