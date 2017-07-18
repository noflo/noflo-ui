noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'Storage Middleware', ->
  mw = null
  idb = null
  before (done) ->
    @timeout 4000
    mw = window.middleware 'ui/StorageMiddleware', baseDir
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
  describe 'receiving a noflo:ready action', ->
    it 'should send storage:db with IndexedDB instance', (done) ->
      action = 'noflo:ready'
      payload = null
      check = (data) ->
        chai.expect(data.name).to.equal 'noflo-ui'
        idb = data
      mw.receiveAction 'storage:db', check, done
      mw.send action, payload, {}
