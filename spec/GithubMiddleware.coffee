noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'GitHub Middleware', ->
  mw = null
  before (done) ->
    @timeout 4000
    mw = window.middleware 'ui/GithubMiddleware', baseDir
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
  describe 'receiving a github:gist action', ->
    mock = null
    beforeEach ->
      mock = sinon.fakeServer.create()
    afterEach ->
      mock.restore()
    it 'should send application:hash for existing gist', (done) ->
      action = 'github:gist'
      payload =
        graph: 'abc123'
      state =
        projects: [
          id: 'foo'
          main: 'foo_main'
        ,
          id: 'bar'
          gist: 'abc123'
          main: 'bar_main'
        ]
      check = (data) ->
        chai.expect(data).to.eql [
          'project'
          'bar'
          'bar_main'
        ]
      mw.receiveAction 'application:hash', check, done
      mw.send action, payload, state
    it 'should send save events for new gist', (done) ->
      action = 'github:gist'
      payload =
        graph: 'abc123'
      state = {}
      expected = [
        caseSensitive: false
        properties:
          name: 'Hello world'
          environment:
            type: 'noflo-browser'
          project: 'abc123'
          id: 'abc123_noflo'
        inports: {}
        outports: {}
        groups: []
        processes: {}
        connections: []
      ,
        id: 'abc123'
        gist: 'abc123'
        main: 'abc123_noflo'
        name: 'Hello world'
        type: 'noflo-browser'
        graphs: []
        components: []
        specs: []
      ]
      check = (data) ->
        # Convert graph object to JSON for comparison
        data = data.toJSON() if data.toJSON
        if data.graphs
          chai.expect(data.graphs.length).to.equal 1
          data.graphs.pop()
        chai.expect(data).to.eql expected.shift()
      mw.receiveAction 'storage:save:graph', check, (err) ->
        return done err if err
        mw.receiveAction 'storage:save:project', check, done
      mw.send action, payload, state

      gistData =
        files:
          'noflo.json':
            content: JSON.stringify
              properties:
                name: 'Hello world'
                environment:
                  type: 'noflo-browser'

      mock.respondWith 'GET', "https://api.github.com/gists/abc123?page=1&per_page=30", [
        200
      ,
        'Content-Type': 'application/json'
      , JSON.stringify gistData
      ]
      do mock.respond
