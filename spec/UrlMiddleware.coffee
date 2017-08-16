noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'URL Middleware', ->
  mw = null
  before (done) ->
    @timeout 4000
    mw = window.middleware 'ui/UrlMiddleware', baseDir
    mw.before done
  beforeEach ->
    mw.beforeEach()
  afterEach ->
    mw.afterEach()
  after ->
    window.location.hash = ''

  describe 'receiving a runtime:connect action', ->
    it 'should pass it out as-is', (done) ->
      action = 'runtime:connect'
      payload =
        hello: 'world'
      mw.receivePass action, payload, done
      mw.send action, payload
  describe 'receiving a user:login action', ->
    it 'should pass it out as-is', (done) ->
      action = 'user:login'
      payload =
        url: window.location.href
        scopes: []
      mw.receivePass action, payload, done
      mw.send action, payload
  describe 'receiving a noflo:ready action', ->
    it 'should send application:url action', (done) ->
      checkUrl = (data) ->
        chai.expect(data).to.equal window.location.href
      mw.receivePass 'noflo:ready', true, ->
        mw.receiveAction 'application:url', checkUrl, done
      mw.send 'noflo:ready', true
  describe 'receiving a storage:ready action', ->
    it 'should send main:open action and pass storage:ready', (done) ->
      checkOpen = (data) ->
        chai.expect(data).to.eql
          route: 'main'
          runtime: null
          project: null
          graph: null
          component: null
          nodes: []
      mw.receivePass 'storage:ready', true, ->
        mw.receiveAction 'main:open', checkOpen, done
      mw.send 'storage:ready', true
  describe 'on hash change to a project URL', ->
    it 'should send storage:open action', (done) ->
      checkOpen = (data) ->
        chai.expect(data).to.eql
          route: 'storage'
          runtime: null
          project: 'noflo-ui'
          graph: 'noflo-ui_graphs_main'
          component: null
          nodes: [
            'UserStorage'
          ]
      mw.receiveAction 'storage:open', checkOpen, done
      window.location.hash = '#project/noflo-ui/noflo-ui_graphs_main/UserStorage'
  describe 'on hash change to a old-style example URL', ->
    it 'should send application:redirect action', (done) ->
      checkRedirect = (data) ->
        chai.expect(data).to.eql '#gist/abc123'
      mw.receiveAction 'application:redirect', checkRedirect, done
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
      mw.receiveAction 'github:gist', checkOpen, done
      window.location.hash = '#gist/abc123'
