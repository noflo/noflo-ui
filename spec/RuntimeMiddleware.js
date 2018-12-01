describe('Runtime Middleware', () => {
  const baseDir = 'noflo-ui';
  let mw = null;
  let iframe = null;
  const runtimeDefinition = {
    id: '7695e97e-79a5-4a22-879d-847ec9592136',
    protocol: 'iframe',
    type: 'noflo-nodejs',
    address: '/base/spec/mockruntime.html',
    project: '090356f9-dfa6-4b10-b4ea-03038faf68be',
  };
  before(function (done) {
    this.timeout(4000);
    mw = window.middleware('ui/RuntimeMiddleware', baseDir);
    mw.before(done);
  });
  beforeEach(() => mw.beforeEach());
  afterEach(() => mw.afterEach());

  // Set up a fake runtime connection and test that we can play both ends
  describe('receiving a storage:ready action', () => {
    it('should pass it out as-is', (done) => {
      const action = 'storage:ready';
      const payload = {
        runtimes: [
          runtimeDefinition,
        ],
      };
      mw.receivePassCheck(action, (received) => {
        chai.expect(received.runtimes).to.be.an('array');
        chai.expect(received.runtimes.length).to.equal(2);
        chai.expect(received.runtimes[0]).to.eql(runtimeDefinition);
      }, done);
      mw.send(action, payload, payload);
    });
  });
  describe('receiving a storage:opened action', () => {
    it('should connect and pass the storage:opened action', (done) => {
      const action = 'storage:opened';
      const payload = {
        state: 'ok',
        project: {
          id: '090356f9-dfa6-4b10-b4ea-03038faf68be',
          graphs: [],
          components: [],
          type: 'noflo-nodejs',
        },
        graphs: [],
        remote: [],
      };
      const capabilities = [
        'protocol:graph',
        'protocol:component',
        'protocol:network',
        'protocol:runtime',
      ];
      const tries = 0;
      const maxTries = 100;
      const waitForIframe = () => {
        if (runtimeDefinition.querySelector) {
          iframe = document.body.querySelector(runtimeDefinition.querySelector);
          const callIframe = () => {
            iframe.contentWindow.handleProtocolMessage((msg, send) => {
              chai.expect(msg.protocol).to.equal('runtime');
              chai.expect(msg.command).to.equal('getruntime');
              send('runtime', 'runtime', {
                id: runtimeDefinition.id,
                type: runtimeDefinition.type,
                capabilities,
                version: '0.7',
              });
              setTimeout(() => {
                done();
              }, 1000);
            });
          };
          if (iframe.contentWindow && typeof iframe.contentWindow.handleProtocolMessage === 'function') {
            callIframe();
            return;
          }
          iframe.addEventListener('load', callIframe);
          return;
        }
        if (tries >= maxTries) {
          return done(new Error('No iframe found'));
        }
        setTimeout(waitForIframe, 100);
      };
      mw.send(action, payload, {
        runtimes: [
          runtimeDefinition,
        ],
        compatible: [
          runtimeDefinition,
        ],
        projects: [
          payload.project,
        ],
      });
      waitForIframe();
    }).timeout(4000);
    it('should have added properties from runtime to the definition', (done) => {
      nofloWaitFor(() => {
        if (runtimeDefinition.version) {
          return true;
        }
        return false;
      }, (err) => {
        if (err) {
          done(err);
          return;
        }
        chai.expect(runtimeDefinition.capabilities).to.be.an('array');
        chai.expect(runtimeDefinition.version).to.equal('0.7');
        done();
      });
    });
    it('should have requested components from runtime', (done) => {
      mw.receiveAction('runtime:components', (message) => {
        chai.expect(message.runtime).to.equal(runtimeDefinition.id);
        chai.expect(message.components).to.eql([]);
      }, done);
      iframe.contentWindow.handleProtocolMessage((msg, send) => {
        chai.expect(msg.protocol).to.equal('component');
        chai.expect(msg.command).to.equal('list');
        send('component', 'componentsready', 0);
      });
    });
  });
  describe('receiving a context:edges action', () => {
    it('should pass it out as-is', (done) => {
      const sentEdges = [{
        from: {
          node: 'Foo',
          port: 'out',
        },
        to: {
          node: 'Bar',
          port: 'in',
        },
      }];
      mw.receivePassCheck('context:edges', (received) => {
        chai.expect(received).to.eql(sentEdges);
      }, done);
      mw.send('context:edges', sentEdges, {
        graphs: [
          {
            name: 'foo',
          },
        ],
        runtime: runtimeDefinition,
      });
    });
    it('should send selected edges to the runtime', (done) => {
      const expectedEdges = [{
        src: {
          node: 'Foo',
          port: 'out',
        },
        tgt: {
          node: 'Bar',
          port: 'in',
        },
      }];
      iframe.contentWindow.handleProtocolMessage((msg, send) => {
        chai.expect(msg.protocol).to.equal('network');
        chai.expect(msg.command).to.equal('edges');
        chai.expect(msg.payload.graph).to.equal('foo');
        chai.expect(msg.payload.edges).to.eql(expectedEdges);
        done();
      });
    }).timeout(4000);
  });
});
