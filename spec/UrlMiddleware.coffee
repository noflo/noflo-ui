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

  describe 'receiving a runtime:connect action', ->
    it 'should pass it out as-is', (done) ->
      action = 'runtime:connect'
      payload =
        hello: 'world'
      middleware.receivePass passAction, action, payload, done
      middleware.send actionIn, action, payload
  describe 'receiving a user:login action', ->
    it 'should pass it out as-is', (done) ->
      action = 'user:login'
      payload =
        url: window.location.href
        scopes: []
      middleware.receivePass passAction, action, payload, done
      middleware.send actionIn, action, payload
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
      middleware.receiveAction newAction, 'application:url', checkUrl, ->
        middleware.receiveAction newAction, 'main:open', checkOpen, done
      middleware.send actionIn, 'noflo:ready', true
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
      middleware.receiveAction newAction, 'project:open', checkOpen, done
      window.location.hash = '#project/noflo-ui/noflo-ui_graphs_main/UserStorage'
  describe 'on hash change to an example URL', ->
    it 'should send github:open action', (done) ->
      checkOpen = (data) ->
        chai.expect(data).to.eql
          route: 'github'
          runtime: null
          project: null
          graph: 'abc123'
          component: null
          nodes: []
          remote: []
      middleware.receiveAction newAction, 'github:open', checkOpen, done
      window.location.hash = '#example/abc123'
