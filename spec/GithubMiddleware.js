describe('GitHub Middleware', () => {
  let mw = null;
  const baseDir = 'noflo-ui';
  before(function (done) {
    this.timeout(4000);
    mw = window.middleware('ui/GithubMiddleware', baseDir);
    return mw.before(done);
  });
  beforeEach(() => mw.beforeEach());
  afterEach(() => mw.afterEach());

  describe('receiving a runtime:connect action', () => it('should pass it out as-is', (done) => {
    const action = 'runtime:connect';
    const payload = { hello: 'world' };
    mw.receivePass(action, payload, done);
    return mw.send(action, payload);
  }));
  describe('receiving a github:gist action', () => {
    let mock = null;
    beforeEach(() => mock = sinon.fakeServer.create());
    afterEach(() => mock.restore());
    it('should send application:sethash for existing gist', (done) => {
      const action = 'github:gist';
      const payload = { graph: 'abc123' };
      const state = {
        projects: [{
          id: 'foo',
          main: 'foo_main',
        },
        {
          id: 'bar',
          gist: 'abc123',
          main: 'bar_main',
        },
        ],
      };
      const check = data => chai.expect(data).to.eql([
        'project',
        'bar',
        'bar_main',
      ]);
      mw.receiveAction('application:sethash', check, done);
      return mw.send(action, payload, state);
    });
    it('should send save events for new gist', (done) => {
      const action = 'github:gist';
      const payload = {
        graph: 'abc123',
      };
      const state = {};
      const expected = [
        {
          id: 'abc123',
          gist: 'abc123',
          main: 'abc123_noflo',
          name: 'Hello world',
          type: 'noflo-browser',
          graphs: [],
          components: [],
          specs: [],
        }, {
          caseSensitive: false,
          properties: {
            name: 'Hello world',
            environment: {
              type: 'noflo-browser',
            },
            project: 'abc123',
            id: 'abc123_noflo',
          },
          inports: {},
          outports: {},
          groups: [],
          processes: {},
          connections: [],
        },
      ];
      const check = function (data) {
        // Convert graph object to JSON for comparison
        if (data.toJSON) { data = data.toJSON(); }
        if (data.graphs) {
          chai.expect(data.graphs.length).to.equal(1);
          data.graphs.pop();
        }
        return chai.expect(data).to.eql(expected.shift());
      };
      mw.receiveAction('github:loading', () => {}, (err) => {
        mw.receiveAction('github:ready', () => {}, (err) => {
          mw.receiveAction('storage:save:project', check, (err) => {
            if (err) { return done(err); }
            return mw.receiveAction('storage:save:graph', check, done);
          });
        });
      });
      mw.send(action, payload, state);

      const gistData = {
        files: {
          'noflo.json': {
            content: JSON.stringify({
              properties: {
                name: 'Hello world',
                environment: {
                  type: 'noflo-browser',
                },
              },
            }),
          },
        },
      };

      mock.respondWith('GET', 'https://api.github.com/rate_limit?page=1&per_page=30', [
        200, {
          'Content-Type': 'application/json',
        }, JSON.stringify({
          rate: {
            remaining: 59,
          },
        }),
      ]);
      mock.respondWith('GET', 'https://api.github.com/gists/abc123?page=1&per_page=30', [
        200,
        {
          'Content-Type': 'application/json',
        }, JSON.stringify(gistData),
      ]);
      mock.respond();
      setTimeout(() => {
        mock.respond();
      }, 10);
    });
  });
});
