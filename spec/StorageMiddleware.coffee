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
  component = null
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
  describe 'receiving a storage:save:component action', ->
    it 'should send a storage:stored:component action', (done) ->
      action = 'storage:save:component'
      comp =
        name: 'Foo'
        language: 'python'
        project: 'baz'
        code: ''
        tests: ''
      check = (data) ->
        chai.expect(data).to.eql comp
        component = data
      mw.receiveAction 'storage:stored:component', check, done
      mw.send action, comp,
        db: idb
  describe 'receiving a storage:load:components action', ->
    it 'should send a storage:stored:component action', (done) ->
      action = 'storage:load:components'
      check = (data) ->
        chai.expect(data).to.eql component
      mw.receiveAction 'storage:stored:component', check, done
      mw.send action, {},
        db: idb
  describe 'receiving a storage:delete:component action', ->
    it 'should send a storage:removed:component action', (done) ->
      action = 'storage:delete:component'
      check = (data) ->
        chai.expect(data).to.equal component.id
      mw.receiveAction 'storage:removed:component', check, done
      mw.send action, component,
        db: idb
