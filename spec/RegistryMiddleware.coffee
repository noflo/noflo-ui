noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'Registry Middleware', ->
  mw = null
  before (done) ->
    @timeout 4000
    mw = window.middleware 'ui/RegistryMiddleware', baseDir
    mw.before done
  beforeEach ->
    mw.beforeEach()
  afterEach ->
    mw.afterEach()

  describe 'receiving a runtime:connect action', ->
    it 'should pass it out as-is', (done) ->
      action = 'runtime:connect'
      payload =
        hello: 'world'
      mw.receivePass action, payload, done
      mw.send action, payload
  describe 'receiving a flowhub:runtimes:fetch action', ->
    mock = null
    beforeEach ->
      mock = sinon.fakeServer.create()
    afterEach ->
      mock.restore()
    it 'should send storage:save:runtime for each runtime on server', (done) ->
      action = 'flowhub:runtimes:fetch'
      payload = true
      state =
        user:
          'grid-user':
            id: 'baz'
          'grid-token': 'abc123'
      runtimes = [
        id: 'foo'
      ,
        id: 'bar'
      ]
      check = (data) ->
        rt = runtimes.shift()
        delete data.seen
        delete data.registered
        chai.expect(data).to.eql rt
      mw.receiveAction 'storage:save:runtime', check, (err) ->
        return done err if err
        mw.receiveAction 'storage:save:runtime', check, done
      mw.send action, payload, state
      mock.respondWith 'GET', "https://api.flowhub.io/runtimes/", [
        200
      ,
        'Content-Type': 'application/json'
      , JSON.stringify runtimes
      ]
      do mock.respond
