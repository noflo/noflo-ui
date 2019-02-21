const qs = require('querystring');
const { waitForElement } = require('../../utils/ui');

describe('Opening a Runtime', () => {
  let iframe;
  let rtIframe;
  const runtimeDefinition = {
    id: '7695e97e-79a5-4a22-879d-847ec9592136',
    protocol: 'iframe',
    type: 'noflo-nodejs',
    address: '/base/spec/mockruntime.html',
    secret: 'foo',
  };
  const capabilities = [
    'protocol:graph',
    'protocol:component',
    'protocol:network',
    'protocol:runtime',
    'component:getsource',
  ];

  before(() => {
    iframe = document.getElementById('app');
  });

  describe('when app receives a runtime URL', () => {
    it('should connect to runtime', () => {
      const endpointUrl = qs.stringify({
        protocol: runtimeDefinition.protocol,
        address: runtimeDefinition.address,
        id: runtimeDefinition.id,
        secret: runtimeDefinition.secret,
      });
      iframe.src = `/base/index.html#runtime/endpoint?${endpointUrl}`;
      return waitForElement(`iframe.iframe-runtime[data-runtime='${runtimeDefinition.id}']`)
        .then(element => new Promise((resolve) => {
          rtIframe = element;
          rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
            chai.expect(msg.protocol).to.equal('runtime');
            chai.expect(msg.command).to.equal('getruntime');
            send('runtime', 'runtime', {
              id: runtimeDefinition.id,
              type: runtimeDefinition.type,
              capabilities,
              version: '0.7',
              graph: 'foo/bar',
              namespace: 'foo',
            });
            resolve();
          });
        }));
    }).timeout(30000);
    it('should request sources for the main graph', (done) => {
      rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
        chai.expect(msg.protocol).to.equal('component');
        chai.expect(msg.command).to.equal('getsource');
        chai.expect(msg.payload.name).to.equal('foo/bar');
        send('component', 'source', {
          code: JSON.stringify({
            caseSensitive: false,
            properties: {
              name: 'main',
              environment: {
                type: runtimeDefinition.type,
              },
            },
            inports: {},
            outports: {},
            groups: [],
            processes: {
              one: {
                component: 'core/Repeat',
                metadata: {
                  label: 'One',
                  x: 324,
                  y: 108,
                },
              },
              two: {
                component: 'core/Repeat',
                metadata: {
                  label: 'Two',
                  x: 504,
                  y: 108,
                },
              },
            },
            connections: [
              {
                src: {
                  process: 'one',
                  port: 'out',
                },
                tgt: {
                  process: 'two',
                  port: 'in',
                },
                metadata: {
                  route: 4,
                },
              },
            ],
          }),
          language: 'json',
          library: 'foo',
          name: 'bar',
        });
        done();
      });
    });
    it('should request a list of components', (done) => {
      rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
        chai.expect(msg.protocol).to.equal('component');
        chai.expect(msg.command).to.equal('list');
        send('component', 'component', {
          name: 'core/Repeat',
          description: 'Repeat a packet',
          icon: 'forward',
          subgraph: false,
          inPorts: [
            {
              addressable: false,
              id: 'in',
              type: 'all',
            },
          ],
          outPorts: [
            {
              addressable: false,
              id: 'in',
              type: 'all',
            },
          ],
        });
        send('component', 'componentsready', 1);
        done();
      });
    });
    it('should request the network status', (done) => {
      rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
        chai.expect(msg.protocol).to.equal('network');
        chai.expect(msg.command).to.equal('getstatus');
        chai.expect(msg.payload.graph).to.equal('foo/bar');
        send({
          graph: 'foo/bar',
          label: 'running',
          running: true,
          started: true,
        });
        done();
      });
    });
    it('should have opened the graph editor', () => waitForElement('noflo-ui the-graph-editor the-graph g.graph')
      .then(graphNode => graphNode.querySelectorAll('g.nodes g.node'))
      .then((nodes) => {
        const nodesArray = Array.prototype.slice.call(nodes);
        chai.expect(nodesArray.length).to.equal(2);
        const titles = nodesArray.map(n => n.getAttribute('name'));
        chai.expect(titles).to.eql(['one', 'two']);
      }));
  });
});
