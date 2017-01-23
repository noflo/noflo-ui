noflo = require 'noflo'

unless noflo.isBrowser()
  chai = require 'chai'
  path = require 'path'
  baseDir = path.resolve __dirname, '../'
else
  baseDir = 'noflo-ui'

describe 'User Middleware', ->
  c = null
  actionIn = null
  passAction = null
  newAction = null
  before (done) ->
    @timeout 4000
    loader = new noflo.ComponentLoader baseDir
    loader.load 'ui/UserMiddleware', (err, instance) ->
      return done err if err
      c = instance
      actionIn = noflo.internalSocket.createSocket()
      c.inPorts.action.attach actionIn
      actionIn.port = 'action'
      ###
      c.network.on 'begingroup', (data) ->
        console.log "   < #{data.id}"
      c.network.on 'data', (data) ->
        console.log "DATA #{data.id}"
      c.network.on 'endgroup', (data) ->
        console.log "   > #{data.id}"
      ###
      c.start()
      c.network.once 'start', ->
        done()
  beforeEach ->
    passAction = noflo.internalSocket.createSocket()
    c.outPorts.pass.attach passAction
    passAction.port = 'pass'
    newAction = noflo.internalSocket.createSocket()
    c.outPorts.action.attach newAction
    newAction.port = 'action'
  afterEach ->
    c.outPorts.pass.detach passAction
    c.outPorts.action.detach newAction

  send = (socket, action, payload) ->
    actionParts = action.split ':'
    socket.beginGroup part for part in actionParts
    socket.send payload
    socket.endGroup part for part in actionParts
    
  receive = (socket, expected, check, done) ->
    received = []
    socket.on 'begingroup', (group) ->
      received.push "< #{group}"
    socket.on 'data', (data) ->
      received.push 'DATA'
      check data
    socket.on 'endgroup', (group) ->
      received.push "> #{group}"
      return unless received.length >= expected.length
      chai.expect(received).to.eql expected
      done()

  receiveAction = (socket, action, check, done) ->
    expected = []
    actionParts = action.split ':'
    expected.push "< #{part}" for part in actionParts
    expected.push 'DATA'
    actionParts.reverse()
    expected.push "> #{part}" for part in actionParts
    receive socket, expected, check, done

  receivePass = (socket, action, payload, done) ->
    check = (data) ->
      # Strict equality check for passed packets
      chai.expect(data).to.equal payload
    receiveAction socket, action, check, done

  describe 'receiving a runtime:connect action', ->
    it 'should pass it out as-is', (done) ->
      action = 'runtime:connect'
      payload =
        hello: 'world'
      receivePass passAction, action, payload, done
      send actionIn, action, payload
  describe 'receiving application:start action', ->
    originalUser = null
    beforeEach ->
      originalUser = localStorage.getItem 'grid-user'
      return unless originalUser
      localStorage.removeItem 'grid-user'
    afterEach ->
      return unless originalUser
      localStorage.setItem 'grid-user', originalUser
    describe 'without logged in user', ->
      it 'should pass it out as-is', (done) ->
        action = 'application:start'
        payload = 'https://app.flowhub.io'
        receivePass passAction, action, payload, done
        send actionIn, action, payload
    describe 'with logged in user', ->
      userData =
        id: 1
        name: 'Henri Bergius'
      beforeEach ->
        localStorage.setItem 'grid-user', JSON.stringify userData
      it 'should pass it out as-is and send user:info', (done) ->
        received =
          pass: false
          user: false
        action = 'application:start'
        payload = 'https://app.flowhub.io'
        receivePass passAction, action, payload, ->
          received.pass = true
          return unless received.user
          done()
        check = (data) ->
          chai.expect(data['grid-user']).to.eql userData
        receiveAction newAction, 'user:info', check, ->
          received.user = true
          return unless received.pass
          done()
        send actionIn, action, payload
    describe 'without user and with OAuth error in URL', ->
      it 'should send the error out', (done) ->
        action = 'application:start'
        payload = "https://app.flowhub.io?error=redirect_uri_mismatch&error_description=The+redirect_uri+MUST+match"
        check = (data) ->
          chai.expect(data.message).to.contain 'The redirect_uri MUST match'
        receiveAction newAction, 'user:error', check, done
        send actionIn, action, payload
    describe 'without user and with invalid grant code in URL', ->
      xhr = null
      code = null
      beforeEach ->
        code = 'dj0328hf3d9cq3c'
        xhr = sinon.fakeServer.create()
      afterEach ->
        xhr.restore()
      it 'should perform a token exchange and fail', (done) ->
        action = 'application:start'
        payload = "https://app.flowhub.io?code=#{code}"
        check = (data) ->
          chai.expect(data.message).to.contain 'bad_code_foo'
        receiveAction newAction, 'user:error', check, done
        send actionIn, action, payload
        xhr.respondWith 'GET', "https://noflo-gate.herokuapp.com/authenticate/#{code}", [
          402
        ,
          'Content-Type': 'application/json'
        , JSON.stringify
          error: 'bad_code_foo'
        ]
        do xhr.respond
    describe 'without user and with grant code in URL yielding invalid API token', ->
      xhr = null
      code = null
      token = null
      beforeEach ->
        code = 'oivwehfh24890f84h'
        token = 'niov2o3wnnv4ioufuhh92348fh42q9'
        xhr = sinon.fakeServer.create()
      afterEach ->
        xhr.restore()
      it 'should perform a token exchange and fail at user fetch', (done) ->
        action = 'application:start'
        payload = "https://app.flowhub.io?code=#{code}"
        check = (data) ->
          chai.expect(data.message).to.contain 'Bad Credentials'
        receiveAction newAction, 'user:error', check, done
        send actionIn, action, payload
        xhr.respondWith 'GET', "https://noflo-gate.herokuapp.com/authenticate/#{code}", (req) ->
          req.respond 200,
            'Content-Type': 'application/json'
          , JSON.stringify
            token: token
        xhr.respondWith 'GET', "https://api.flowhub.io/user", (req) ->
          req.respond 401,
            'Content-Type': 'application/json'
          , JSON.stringify
            message: 'Bad Credentials'
        do xhr.respond
        do xhr.respond
    describe 'without user and with valid grant code in URL', ->
      xhr = null
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
        xhr = sinon.fakeServer.create()
      afterEach ->
        xhr.restore()
      it 'should perform a token exchange and update user information', (done) ->
        action = 'application:start'
        payload = "https://app.flowhub.io?code=#{code}"
        check = (data) ->
          chai.expect(data['grid-user']).to.eql userData
        receiveAction newAction, 'user:info', check, done
        send actionIn, action, payload
        xhr.respondWith 'GET', "https://noflo-gate.herokuapp.com/authenticate/#{code}", (req) ->
          req.respond 200,
            'Content-Type': 'application/json'
          , JSON.stringify
            token: token
        xhr.respondWith 'GET', "https://api.flowhub.io/user", (req) ->
          req.respond 200,
            'Content-Type': 'application/json'
          , JSON.stringify userData
        do xhr.respond
        do xhr.respond
  describe 'receiving user:login action', ->
    describe 'with app URL not matching redirect configuration', ->
      it 'should send user:error', (done) ->
        action = 'user:login'
        check = (data) ->
          chai.expect(data.message).to.contain 'http://localhost:9999'
        receiveAction newAction, 'user:error', check, done
        send actionIn, action,
          url: 'http://example.net'
          scopes: []
    describe 'with app URL matching redirect configuration', ->
      it 'should send application:redirect action with redirect URL', (done) ->
        action = 'user:login'
        check = (data) ->
          chai.expect(data).to.contain 'https://github.com/login/oauth/authorize'
        receiveAction newAction, 'application:redirect', check, done
        send actionIn, action,
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
        chai.expect(data).to.eql {}
      receiveAction newAction, 'user:info', check, done
      send actionIn, action, true
    it 'should have cleared user data', (done) ->
      chai.expect(localStorage.getItem('grid-user')).to.equal null
      done()