
describe('DispatchAction component', () => {
  const noflo = require('noflo');
  const baseDir = 'noflo-ui';
  let c = null;
  let routes = null;
  let ins = null;
  let pass = null;
  let handle = [];

  before((done) => {
    const loader = new noflo.ComponentLoader(baseDir);
    return loader.load('ui/DispatchAction', (err, instance) => {
      if (err) { return done(err); }
      c = instance;
      routes = noflo.internalSocket.createSocket();
      c.inPorts.routes.attach(routes);
      ins = noflo.internalSocket.createSocket();
      c.inPorts.in.attach(ins);
      return done();
    });
  });
  beforeEach(() => {
    pass = noflo.internalSocket.createSocket();
    c.outPorts.pass.attach(pass);
    return (() => {
      const result = [];
      for (let idx = 0; idx <= 5; idx++) {
        const handler = noflo.internalSocket.createSocket();
        c.outPorts.handle.attach(handler, idx);
        result.push(handle.push(handler));
      }
      return result;
    })();
  });
  afterEach(() => {
    c.outPorts.pass.detach(pass);
    pass = null;
    for (let idx = 0; idx < handle.length; idx++) {
      const handler = handle[idx];
      c.outPorts.handle.detach(handler, idx);
    }
    return handle = [];
  });

  const sendAction = function (action, payload, state) {
    const parts = action.split(':');
    return ins.send({
      action,
      payload,
      state,
    });
  };

  describe('receiving a unhandled action', () => it('should send it to PASS', (done) => {
    routes.send('foo:bar');
    const expected = {
      payload: [1, 2],
      state: {
        hello: 'world',
      },
    };
    pass.on('data', (data) => {
      chai.expect(data.payload).to.equal(expected.payload);
      chai.expect(data.state).to.equal(expected.state);
      return done();
    });
    return sendAction('foo:baz', expected.payload, expected.state);
  }));
  describe('receiving a handled action', () => it('should send it to correct handler', (done) => {
    routes.send('foo:bar,foo:baz');
    const expected = {
      payload: [1, 2],
      state: {
        hello: 'world',
      },
    };
    pass.on('data', data => done(new Error('Received pass')));
    handle[1].on('data', (data) => {
      chai.expect(data.payload).to.equal(expected.payload);
      chai.expect(data.state).to.equal(expected.state);
      return done();
    });
    return sendAction('foo:baz', expected.payload, expected.state);
  }));
  describe('receiving a handled wildcard action', () => {
    it('should send it to correct handler', (done) => {
      routes.send('bar:baz,foo:*');
      const expected = {
        payload: [1, 2],
        state: {
          hello: 'world',
        },
      };
      pass.on('data', data => done(new Error('Received pass')));
      handle[1].on('data', (data) => {
        chai.expect(data.payload).to.equal(expected.payload);
        chai.expect(data.state).to.equal(expected.state);
        return done();
      });
      return sendAction('foo:baz', expected.payload, expected.state);
    });
    it.skip('should send it to correct handler also with deeper action paths', (done) => {
      routes.send('bar:baz,foo:*');
      const expected = {
        payload: [1, 2],
        state: {
          hello: 'world',
        },
      };
      pass.on('data', data => done(new Error('Received pass')));
      handle[1].on('data', (data) => {
        chai.expect(data.payload).to.equal(expected.payload);
        chai.expect(data.state).to.equal(expected.state);
        return done();
      });
      return sendAction('foo:baz:hello:world', expected.payload, expected.state);
    });
  });
});
