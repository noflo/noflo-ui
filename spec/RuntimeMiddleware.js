describe('Runtime Middleware', function() {
  const baseDir = 'noflo-ui';
  let mw = null;
  let runtime = null;
  before(function(done) {
    this.timeout(4000);
    const fixtures = document.createElement('div');
    document.body.appendChild(fixtures);
    const transport = require('fbp-protocol-client').getTransport('iframe');
    runtime = new transport({
      address: '/base/spec/mockruntime.html'});
    runtime.setParentElement(fixtures);
    window.runtime = runtime;

    mw = window.middleware('ui/RuntimeMiddleware', baseDir);
    return mw.before(done);
  });
  beforeEach(() => mw.beforeEach());
  afterEach(function() {
    mw.afterEach();
    return runtime.iframe.contentWindow.clearMessages();
  });

  // Set up a fake runtime connection and test that we can play both ends
  it('should be able to connect', function(done) {
    const capabilities = [
      'protocol:graph',
      'protocol:component',
      'protocol:network',
      'protocol:runtime'
    ];
    runtime.connect();
    runtime.once('capabilities', function(rtCapabilities) {
      chai.expect(rtCapabilities).to.eql(capabilities);
      return done();
    });
    return runtime.iframe.addEventListener('load', () =>
      setTimeout(() =>
        runtime.iframe.contentWindow.handleProtocolMessage(function(msg, send) {
          chai.expect(msg.protocol).to.equal('runtime');
          chai.expect(msg.command).to.equal('getruntime');
          return send('runtime', 'runtime',
            {capabilities});
        })
      
      , 100)
    );
  });

  describe('receiving a runtime:connected action', () =>
    it('should pass it out as-is', function(done) {
      const action = 'runtime:connected';
      const payload = runtime;
      mw.receivePass(action, payload, done);
      return mw.send(action, payload);
    })
  );
  describe('receiving a context:edges action', () =>
    it('should send selected edges to the runtime', function(done) {
      const sentEdges = [{
        from: {
          node: 'Foo',
          port: 'out'
        },
        to: {
          node: 'Bar',
          port: 'in'
        }
      }
      ];
      const expectedEdges = [{
        src: {
          node: 'Foo',
          port: 'out'
        },
        tgt: {
          node: 'Bar',
          port: 'in'
        }
      }
      ];
      mw.send('context:edges', sentEdges, {
        graphs: [
          {name: 'foo'}
        ],
        runtime
      }
      );
      return runtime.iframe.contentWindow.handleProtocolMessage(function(msg) {
        chai.expect(msg.protocol).to.equal('network');
        chai.expect(msg.command).to.equal('edges');
        chai.expect(msg.payload.graph).to.equal('foo');
        chai.expect(msg.payload.edges).to.eql(expectedEdges);
        return done();
      });
    })
  );
});
