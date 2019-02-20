const sinon = require('sinon');
const { middleware } = require('../utils/middleware');

describe('Registry Middleware', () => {
  let mw = null;
  const baseDir = 'noflo-ui';
  before(function (done) {
    this.timeout(4000);
    mw = middleware('ui/RegistryMiddleware', baseDir);
    mw.before(done);
  });
  beforeEach(() => mw.beforeEach());
  afterEach(() => mw.afterEach());

  describe('receiving a runtime:connect action', () => {
    it('should pass it out as-is', (done) => {
      const action = 'runtime:connect';
      const payload = { hello: 'world' };
      mw.receivePass(action, payload, done);
      mw.send(action, payload);
    });
  });
  describe('receiving a flowhub:runtimes:fetch action', () => {
    let mock = null;
    beforeEach(() => {
      mock = sinon.fakeServer.create();
    });
    afterEach(() => mock.restore());
    it('should send storage:save:runtime for each runtime on server', (done) => {
      const action = 'flowhub:runtimes:fetch';
      const payload = true;
      const state = {
        user: {
          'flowhub-user': {
            id: 'baz',
          },
          'flowhub-token': 'abc123',
        },
      };
      const runtimes = [
        { id: 'foo' },
        { id: 'bar' },
      ];
      const check = function (d) {
        const data = d;
        const rt = runtimes.shift();
        delete data.seen;
        delete data.registered;
        chai.expect(data).to.eql(rt);
      };
      mw.receiveAction('storage:save:runtime', check, (err) => {
        if (err) {
          done(err);
          return;
        }
        mw.receiveAction('storage:save:runtime', check, done);
      });
      mw.send(action, payload, state);
      mock.respondWith('GET', 'https://api.flowhub.io/runtimes/', [
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(runtimes),
      ]);
      (mock.respond)();
    });
  });
});
