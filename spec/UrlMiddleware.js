describe('URL Middleware', () => {
  const baseDir = 'noflo-ui';
  let mw = null;
  before((done) => {
    this.timeout(4000);
    mw = window.middleware('ui/UrlMiddleware', baseDir);
    return mw.before(done);
  });
  beforeEach(() => mw.beforeEach());
  afterEach(() => mw.afterEach());
  after(() => {
    window.location.hash = '';
  });

  describe('receiving a runtime:connect action', () => it('should pass it out as-is', (done) => {
    const action = 'runtime:connect';
    const payload = { hello: 'world' };
    mw.receivePass(action, payload, done);
    return mw.send(action, payload);
  }));
  describe('receiving a user:login action', () => it('should pass it out as-is', (done) => {
    const action = 'user:login';
    const payload = {
      url: window.location.href,
      scopes: [],
    };
    mw.receivePass(action, payload, done);
    return mw.send(action, payload);
  }));
  describe('receiving a noflo:ready action', () => it('should send application:url action', (done) => {
    const checkUrl = data => chai.expect(data).to.equal(window.location.href);
    mw.receivePass('noflo:ready', true, () => mw.receiveAction('application:url', checkUrl, done));
    return mw.send('noflo:ready', true);
  }));
  describe('receiving a storage:ready action', () => it('should send application:hash action and pass storage:ready', (done) => {
    const checkOpen = (data) => {
      chai.expect(data).to.equal('');
    };
    mw.receivePass('storage:ready', true, () => {
      mw.receiveAction('application:hash', checkOpen, done);
    });
    return mw.send('storage:ready', true);
  }));
  describe('receiving a application:hash action with empty payload', () => it('should send main:open action', (done) => {
    const checkOpen = (data) => {
      chai.expect(data).to.eql({
        route: 'main',
        runtime: null,
        project: null,
        graph: null,
        component: null,
        nodes: [],
      });
    };
    mw.receiveAction('main:open', checkOpen, done);
    mw.send('application:hash', '');
  }));
  describe('on hash change to a project URL', () => it('should send storage:open action', (done) => {
    const checkOpen = (data) => {
      chai.expect(data).to.eql({
        route: 'storage',
        runtime: null,
        project: 'noflo-ui',
        graph: 'noflo-ui_graphs_main',
        component: null,
        nodes: [
          'UserStorage',
        ],
      });
    };
    mw.receiveAction('storage:open', checkOpen, done);
    mw.send('application:hash', 'project/noflo-ui/noflo-ui_graphs_main/UserStorage');
  }));
  describe('on hash change to a old-style example URL', () => it('should send application:redirect action', (done) => {
    const checkRedirect = data => chai.expect(data).to.eql('#gist/abc123');
    mw.receiveAction('application:redirect', checkRedirect, done);
    mw.send('application:hash', 'example/abc123');
  }));
  describe('on hash change to an gist URL', () => it('should send github:gist action', (done) => {
    const checkOpen = data => chai.expect(data).to.eql({
      route: 'github',
      runtime: null,
      project: null,
      graph: 'abc123',
      component: null,
      nodes: [],
      remote: [],
    });
    mw.receiveAction('github:gist', checkOpen, done);
    mw.send('application:hash', 'gist/abc123');
  }));
});
