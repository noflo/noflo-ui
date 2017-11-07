describe('User Middleware', function() {
  const baseDir = 'noflo-ui';
  let mw = null;
  before(function(done) {
    this.timeout(4000);
    mw = window.middleware('ui/UserMiddleware', baseDir);
    return mw.before(done);
  });
  beforeEach(() => mw.beforeEach());
  afterEach(() => mw.afterEach());

  describe('receiving a runtime:connect action', () =>
    it('should pass it out as-is', function(done) {
      const action = 'runtime:connect';
      const payload =
        {hello: 'world'};
      mw.receivePass(action, payload, done);
      return mw.send(action, payload);
    })
  );
  describe('receiving application:url action', function() {
    let originalUser = null;
    let originalToken = null;
    beforeEach(function() {
      originalUser = localStorage.getItem('grid-user');
      originalToken = localStorage.getItem('grid-token');
      if (originalUser) { localStorage.removeItem('grid-user'); }
      if (originalToken) { return localStorage.removeItem('grid-token'); }
    });
    afterEach(function() {
      if (originalUser) { localStorage.setItem('grid-user', originalUser); }
      if (originalToken) { return localStorage.setItem('grid-token', originalToken); }
    });
    describe('without logged in user', () =>
      it('should send out an empty user:info', function(done) {
        const action = 'application:url';
        const payload = 'https://app.flowhub.io';
        const check = data => chai.expect(data['grid-user']).to.be.a('null');
        mw.receiveAction('user:info', check, done);
        return mw.send(action, payload);
      })
    );
    describe('with logged in user', function() {
      const userData = {
        id: 1,
        name: 'Henri Bergius'
      };
      const userToken = 'oh3h8f89h28hyf98yf24g34g';
      let mock = null;
      beforeEach(function() {
        localStorage.setItem('grid-user', JSON.stringify(userData));
        localStorage.setItem('grid-token', userToken);
        return mock = sinon.fakeServer.create();
      });
      afterEach(() => mock.restore());
      it('should pass it out as-is and send user:info when token is valid', function(done) {
        const action = 'application:url';
        const payload = 'https://app.flowhub.io';
        const check = data => chai.expect(data['grid-user']).to.eql(userData);
        mw.receiveAction('user:info', check, done);
        mw.send(action, payload);
        mock.respondWith('GET', "https://api.flowhub.io/user", [
          200
          ,
          {'Content-Type': 'application/json'}
          , JSON.stringify(userData)
        ]);
        return (mock.respond)();
      });
      it('should pass it out as-is and send updated user:info when token is valid', function(done) {
        const action = 'application:url';
        const payload = 'https://app.flowhub.io';
        const newUserData = {
          id: 1,
          name: 'Henri Bergius',
          github: {
            scopes: ['repo']
          },
          plan: {
            type: 'backer'
          }
        };
        const check = function(data) {
          // Check payload sent to UI
          chai.expect(data['grid-user']).to.eql(newUserData);
          // Check data stored in cache
          const cached = JSON.parse(localStorage.getItem('grid-user'));
          return chai.expect(cached).to.eql(newUserData);
        };
        mw.receiveAction('user:info', check, done);
        mw.send(action, payload);
        mock.respondWith('GET', "https://api.flowhub.io/user", [
          200
          ,
          {'Content-Type': 'application/json'}
          , JSON.stringify(newUserData)
        ]);
        return (mock.respond)();
      });
      it('should send user:logout when token is invalid', function(done) {
        const action = 'application:url';
        const payload = 'https://app.flowhub.io';
        const check = function(data) {};
        mw.receiveAction('user:logout', check, done);
        mw.send(action, payload);
        mock.respondWith('GET', "https://api.flowhub.io/user", [
          401
          ,
          {'Content-Type': 'application/json'}
          , JSON.stringify(userData)
        ]);
        return (mock.respond)();
      });
    });
    describe('without user and with OAuth error in URL', () =>
      it('should send the error out', function(done) {
        const action = 'application:url';
        const payload = "https://app.flowhub.io?error=redirect_uri_mismatch&error_description=The+redirect_uri+MUST+match";
        const check = data => chai.expect(data.message).to.contain('The redirect_uri MUST match');
        mw.receiveAction('user:error', check, done);
        return mw.send(action, payload);
      })
    );
    describe('without user and with invalid grant code in URL', function() {
      let mock = null;
      let code = null;
      beforeEach(function() {
        code = 'dj0328hf3d9cq3c';
        return mock = sinon.fakeServer.create();
      });
      afterEach(() => mock.restore());
      it('should perform a token exchange and fail', function(done) {
        const action = 'application:url';
        const payload = `https://app.flowhub.io?code=${code}&state=`;
        const check = data => chai.expect(data.message).to.contain('bad_code_foo');
        mw.receiveAction('user:error', check, done);
        mw.send(action, payload);
        mock.respondWith('GET', `https://noflo-gate.herokuapp.com/authenticate/${code}`, [
          402
          ,
          {'Content-Type': 'application/json'}
          , JSON.stringify({
            error: 'bad_code_foo'})
        ]);
        return (mock.respond)();
      });
    });
    describe('without user and with grant code in URL yielding invalid API token', function() {
      let mock = null;
      let code = null;
      let token = null;
      beforeEach(function() {
        code = 'oivwehfh24890f84h';
        token = 'niov2o3wnnv4ioufuhh92348fh42q9';
        return mock = sinon.fakeServer.create();
      });
      afterEach(() => mock.restore());
      it('should perform a token exchange and fail at user fetch', function(done) {
        const action = 'application:url';
        const payload = `https://app.flowhub.io?code=${code}&state=`;
        const check = data => chai.expect(data.message).to.contain('Bad Credentials');
        mw.receiveAction('user:error', check, done);
        mw.send(action, payload);
        mock.respondWith('GET', `https://noflo-gate.herokuapp.com/authenticate/${code}`, req =>
          req.respond(200,
            {'Content-Type': 'application/json'}
            , JSON.stringify({
              token})
          )
        );
        mock.respondWith('GET', "https://api.flowhub.io/user", req =>
          req.respond(401,
            {'Content-Type': 'application/json'}
            , JSON.stringify({
              message: 'Bad Credentials'})
          )
        );
        (mock.respond)();
        return (mock.respond)();
      });
    });
    describe('without user and with valid grant code in URL', function() {
      let mock = null;
      let code = null;
      let token = null;
      let userData = null;
      beforeEach(function() {
        code = 'oivwehfh24890f84h';
        token = 'niov2o3wnnv4ioufuhh92348fh42q9';
        userData = {
          id: 1,
          name: 'Henri Bergius',
          github: {
            username: 'bergie',
            token
          },
          plan: {
            type: 'free'
          }
        };
        return mock = sinon.fakeServer.create();
      });
      afterEach(() => mock.restore());
      it('should perform a token exchange and update user information without state in URL', function(done) {
        const action = 'application:url';
        const payload = `https://app.flowhub.io?code=${code}`;
        const check = data => chai.expect(data['grid-user']).to.eql(userData);
        mw.receiveAction('user:info', check, done);
        mw.send(action, payload);
        mock.respondWith('GET', `https://noflo-gate.herokuapp.com/authenticate/${code}`, req =>
          req.respond(200,
            {'Content-Type': 'application/json'}
            , JSON.stringify({
              token})
          )
        );
        mock.respondWith('GET', "https://api.flowhub.io/user", req =>
          req.respond(200,
            {'Content-Type': 'application/json'}
            , JSON.stringify(userData))
        );
        (mock.respond)();
        return (mock.respond)();
      });
      it('should perform a token exchange and update user information with state in URL', function(done) {
        const action = 'application:url';
        const payload = `https://app.flowhub.io?code=${code}&state=`;
        const check = data => chai.expect(data['grid-user']).to.eql(userData);
        mw.receiveAction('user:info', check, done);
        mw.send(action, payload);
        mock.respondWith('GET', `https://noflo-gate.herokuapp.com/authenticate/${code}`, req =>
          req.respond(200,
            {'Content-Type': 'application/json'}
            , JSON.stringify({
              token})
          )
        );
        mock.respondWith('GET', "https://api.flowhub.io/user", req =>
          req.respond(200,
            {'Content-Type': 'application/json'}
            , JSON.stringify(userData))
        );
        (mock.respond)();
        return (mock.respond)();
      });
    });
  });
  describe('receiving user:login action', function() {
    describe('with app URL not matching redirect configuration', () =>
      it('should send user:error', function(done) {
        const action = 'user:login';
        const check = data => chai.expect(data.message).to.contain('http://localhost:9999');
        mw.receiveAction('user:error', check, done);
        return mw.send(action, {
          url: 'http://example.net',
          scopes: []
        });
      })
    );
    describe('with app URL matching redirect configuration', () =>
      it('should send application:redirect action with redirect URL', function(done) {
        const action = 'user:login';
        const check = data => chai.expect(data).to.contain('https://github.com/login/oauth/authorize');
        mw.receiveAction('application:redirect', check, done);
        return mw.send(action, {
          url: 'http://localhost:9999',
          scopes: []
        });
      })
    );
  });
  describe('receiving user:logout action', function() {
    let originalUser = null;
    const userData = {
      id: 1,
      name: 'Henri Bergius'
    };
    before(function() {
      originalUser = localStorage.getItem('grid-user');
      return localStorage.setItem('grid-user', JSON.stringify(userData));
    });
    after(function() {
      if (!originalUser) { return; }
      return localStorage.setItem('grid-user', originalUser);
    });
    it('should send empty object as user:info', function(done) {
      const action = 'user:logout';
      const check = data => chai.expect(data['grid-user']).to.be.a('null');
      mw.receiveAction('user:info', check, done);
      return mw.send(action, true);
    });
    it('should have cleared user data', function(done) {
      chai.expect(localStorage.getItem('grid-user')).to.equal(null);
      return done();
    });
  });
});
