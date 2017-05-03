noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'User Middleware', ->
  mw = null
  before (done) ->
    @timeout 4000
    mw = window.middleware 'ui/UserMiddleware', baseDir
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
  describe 'receiving application:url action', ->
    originalUser = null
    originalToken = null
    beforeEach ->
      originalUser = localStorage.getItem 'grid-user'
      originalToken = localStorage.getItem 'grid-token'
      localStorage.removeItem 'grid-user' if originalUser
      localStorage.removeItem 'grid-token' if originalToken
    afterEach ->
      localStorage.setItem 'grid-user', originalUser if originalUser
      localStorage.setItem 'grid-token', originalToken if originalToken
    describe 'without logged in user', ->
      it 'should send out an empty user:info', (done) ->
        action = 'application:url'
        payload = 'https://app.flowhub.io'
        check = (data) ->
          chai.expect(data['grid-user']).to.be.a 'null'
        mw.receiveAction 'user:info', check, done
        mw.send action, payload
    describe 'with logged in user', ->
      userData =
        id: 1
        name: 'Henri Bergius'
      userToken = 'oh3h8f89h28hyf98yf24g34g'
      mock = null
      beforeEach ->
        localStorage.setItem 'grid-user', JSON.stringify userData
        localStorage.setItem 'grid-token', userToken
        mock = sinon.fakeServer.create()
      afterEach ->
        mock.restore()
      it 'should pass it out as-is and send user:info when token is valid', (done) ->
        action = 'application:url'
        payload = 'https://app.flowhub.io'
        check = (data) ->
          chai.expect(data['grid-user']).to.eql userData
        mw.receiveAction 'user:info', check, done
        mw.send action, payload
        mock.respondWith 'GET', "https://api.flowhub.io/user", [
          200
        ,
          'Content-Type': 'application/json'
        , JSON.stringify userData
        ]
        do mock.respond
      it 'should pass it out as-is and send updated user:info when token is valid', (done) ->
        action = 'application:url'
        payload = 'https://app.flowhub.io'
        newUserData =
          id: 1
          name: 'Henri Bergius'
          github:
            scopes: ['repo']
          plan:
            type: 'backer'
        check = (data) ->
          # Check payload sent to UI
          chai.expect(data['grid-user']).to.eql newUserData
          # Check data stored in cache
          cached = JSON.parse localStorage.getItem 'grid-user'
          chai.expect(cached).to.eql newUserData
        mw.receiveAction 'user:info', check, done
        mw.send action, payload
        mock.respondWith 'GET', "https://api.flowhub.io/user", [
          200
        ,
          'Content-Type': 'application/json'
        , JSON.stringify newUserData
        ]
        do mock.respond
      it 'should send user:logout when token is invalid', (done) ->
        action = 'application:url'
        payload = 'https://app.flowhub.io'
        check = (data) ->
        mw.receiveAction 'user:logout', check, done
        mw.send action, payload
        mock.respondWith 'GET', "https://api.flowhub.io/user", [
          401
        ,
          'Content-Type': 'application/json'
        , JSON.stringify userData
        ]
        do mock.respond
    describe 'without user and with OAuth error in URL', ->
      it 'should send the error out', (done) ->
        action = 'application:url'
        payload = "https://app.flowhub.io?error=redirect_uri_mismatch&error_description=The+redirect_uri+MUST+match"
        check = (data) ->
          chai.expect(data.message).to.contain 'The redirect_uri MUST match'
        mw.receiveAction 'user:error', check, done
        mw.send action, payload
    describe 'without user and with invalid grant code in URL', ->
      mock = null
      code = null
      beforeEach ->
        code = 'dj0328hf3d9cq3c'
        mock = sinon.fakeServer.create()
      afterEach ->
        mock.restore()
      it 'should perform a token exchange and fail', (done) ->
        action = 'application:url'
        payload = "https://app.flowhub.io?code=#{code}&state="
        check = (data) ->
          chai.expect(data.message).to.contain 'bad_code_foo'
        mw.receiveAction 'user:error', check, done
        mw.send action, payload
        mock.respondWith 'GET', "https://noflo-gate.herokuapp.com/authenticate/#{code}", [
          402
        ,
          'Content-Type': 'application/json'
        , JSON.stringify
          error: 'bad_code_foo'
        ]
        do mock.respond
    describe 'without user and with grant code in URL yielding invalid API token', ->
      mock = null
      code = null
      token = null
      beforeEach ->
        code = 'oivwehfh24890f84h'
        token = 'niov2o3wnnv4ioufuhh92348fh42q9'
        mock = sinon.fakeServer.create()
      afterEach ->
        mock.restore()
      it 'should perform a token exchange and fail at user fetch', (done) ->
        action = 'application:url'
        payload = "https://app.flowhub.io?code=#{code}&state="
        check = (data) ->
          chai.expect(data.message).to.contain 'Bad Credentials'
        mw.receiveAction 'user:error', check, done
        mw.send action, payload
        mock.respondWith 'GET', "https://noflo-gate.herokuapp.com/authenticate/#{code}", (req) ->
          req.respond 200,
            'Content-Type': 'application/json'
          , JSON.stringify
            token: token
        mock.respondWith 'GET', "https://api.flowhub.io/user", (req) ->
          req.respond 401,
            'Content-Type': 'application/json'
          , JSON.stringify
            message: 'Bad Credentials'
        do mock.respond
        do mock.respond
    describe 'without user and with valid grant code in URL', ->
      mock = null
      code = null
      token = null
      userData = null
      beforeEach ->
        code = 'oivwehfh24890f84h'
        token = 'niov2o3wnnv4ioufuhh92348fh42q9'
        userData =
          id: 1
          name: 'Henri Bergius'
          github:
            username: 'bergie'
            token: token
          plan:
            type: 'free'
        mock = sinon.fakeServer.create()
      afterEach ->
        mock.restore()
      it 'should perform a token exchange and update user information without state in URL', (done) ->
        action = 'application:url'
        payload = "https://app.flowhub.io?code=#{code}"
        check = (data) ->
          chai.expect(data['grid-user']).to.eql userData
        mw.receiveAction 'user:info', check, done
        mw.send action, payload
        mock.respondWith 'GET', "https://noflo-gate.herokuapp.com/authenticate/#{code}", (req) ->
          req.respond 200,
            'Content-Type': 'application/json'
          , JSON.stringify
            token: token
        mock.respondWith 'GET', "https://api.flowhub.io/user", (req) ->
          req.respond 200,
            'Content-Type': 'application/json'
          , JSON.stringify userData
        do mock.respond
        do mock.respond
      it 'should perform a token exchange and update user information with state in URL', (done) ->
        action = 'application:url'
        payload = "https://app.flowhub.io?code=#{code}&state="
        check = (data) ->
          chai.expect(data['grid-user']).to.eql userData
        mw.receiveAction 'user:info', check, done
        mw.send action, payload
        mock.respondWith 'GET', "https://noflo-gate.herokuapp.com/authenticate/#{code}", (req) ->
          req.respond 200,
            'Content-Type': 'application/json'
          , JSON.stringify
            token: token
        mock.respondWith 'GET', "https://api.flowhub.io/user", (req) ->
          req.respond 200,
            'Content-Type': 'application/json'
          , JSON.stringify userData
        do mock.respond
        do mock.respond
  describe 'receiving user:login action', ->
    describe 'with app URL not matching redirect configuration', ->
      it 'should send user:error', (done) ->
        action = 'user:login'
        check = (data) ->
          chai.expect(data.message).to.contain 'http://localhost:9999'
        mw.receiveAction 'user:error', check, done
        mw.send action,
          url: 'http://example.net'
          scopes: []
    describe 'with app URL matching redirect configuration', ->
      it 'should send application:redirect action with redirect URL', (done) ->
        action = 'user:login'
        check = (data) ->
          chai.expect(data).to.contain 'https://github.com/login/oauth/authorize'
        mw.receiveAction 'application:redirect', check, done
        mw.send action,
          url: 'http://localhost:9999'
          scopes: []
  describe 'receiving user:logout action', ->
    originalUser = null
    userData =
      id: 1
      name: 'Henri Bergius'
    before ->
      originalUser = localStorage.getItem 'grid-user'
      localStorage.setItem 'grid-user', JSON.stringify userData
    after ->
      return unless originalUser
      localStorage.setItem 'grid-user', originalUser
    it 'should send empty object as user:info', (done) ->
      action = 'user:logout'
      check = (data) ->
        chai.expect(data['grid-user']).to.be.a 'null'
      mw.receiveAction 'user:info', check, done
      mw.send action, true
    it 'should have cleared user data', (done) ->
      chai.expect(localStorage.getItem('grid-user')).to.equal null
      done()
