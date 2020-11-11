const qs = require('querystring');
const syn = require('syn');
const { waitFor, waitForElement } = require('../../utils/ui');

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
  const graphDefinition = {
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
  };
  const sendComponents = (msg, send, callback) => {
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
    callback();
  };

  before('get the app iframe', () => {
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
      iframe.src = `/base/browser/index.html#runtime/endpoint?${endpointUrl}`;
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
          code: JSON.stringify(graphDefinition),
          language: 'json',
          library: 'foo',
          name: 'bar',
        });
        done();
      });
    });
    it('should request a list of components', (done) => {
      // FIXME: Right now live mode requests component list twice (once in OpenLiveMode
      // and once in ListenRuntime). Should be made to request once and reuse
      rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
        sendComponents(msg, send, () => {
          rtIframe.contentWindow.handleProtocolMessage((msg2, send2) => {
            sendComponents(msg2, send2, done);
          });
        });
      });
    });
    it('should request the network status', (done) => {
      rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
        chai.expect(msg.protocol).to.equal('network');
        chai.expect(msg.command).to.equal('getstatus');
        chai.expect(msg.payload.graph).to.equal('foo/bar');
        send('network', 'status', {
          graph: 'foo/bar',
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
    it('should show the graph name in the search bar', () => waitForElement('noflo-ui noflo-search h1 span')
      .then((searchTitle) => {
        chai.expect(searchTitle.innerHTML).to.equal('bar');
      }));
    it('should show the graph as "running"', () => waitFor(1000) // Seems this one takes sometimes a while to update
      .then(() => waitForElement('noflo-ui noflo-runtime #runcontrol h2'))
      .then((runtimestatus) => {
        chai.expect(runtimestatus.innerHTML).to.equal('running');
      }));
    describe('packet inspection', () => {
      let edgeInspector;
      before('send a packet', () => {
        rtIframe.contentWindow.sendProtocolMessage('network', 'data', {
          data: 'packet one',
          graph: 'foo/bar',
          id: 'one() OUT -> IN two()',
          src: {
            node: 'one',
            port: 'out',
          },
          tgt: {
            node: 'two',
            port: 'in',
          },
        });
      });
      it('should show edge inspector when clicking on a wire', () => waitForElement('noflo-ui the-graph-editor the-graph g.edges g.edge')
        .then((edge) => {
          syn.click(edge);
        })
        .then(() => waitForElement('noflo-ui noflo-context section#contextsection the-card noflo-edge-inspector'))
        .then((element) => {
          edgeInspector = element;
        }));
      it('should send the selected edges to the runtime', (done) => {
        rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
          chai.expect(msg.protocol).to.equal('network');
          chai.expect(msg.command).to.equal('edges');
          chai.expect(msg.payload.graph).to.equal('foo/bar');
          chai.expect(msg.payload.edges.length).to.equal(1);
          send('network', 'edges', {
            edges: msg.payload.edges,
            graph: msg.payload.graph,
          });
          done();
        });
      });
      it('should show the edge title in the inspector', () => waitForElement('header h1', true, edgeInspector)
        .then((edgeTitle) => {
          chai.expect(edgeTitle.innerText).to.contain('one OUT');
          chai.expect(edgeTitle.innerText).to.contain('IN two');
        }));
      it('should show the first packet in the inspector', () => waitForElement('ul#events', true, edgeInspector)
        .then((eventsList) => {
          const packets = Array.prototype.slice.call(eventsList.querySelectorAll('li.data'));
          const packetValues = packets.map(p => p.innerText);
          chai.expect(packetValues).to.eql(['"packet one"']);
        }));
      it('closing the edge inspector', () => waitForElement('noflo-ui the-graph-editor the-graph svg.app-svg')
        .then((edge) => {
          syn.click(edge);
        }));
      it('should send the selected edges to the runtime', (done) => {
        rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
          chai.expect(msg.protocol).to.equal('network');
          chai.expect(msg.command).to.equal('edges');
          chai.expect(msg.payload.graph).to.equal('foo/bar');
          chai.expect(msg.payload.edges).to.eql([]);
          send('network', 'edges', {
            edges: msg.payload.edges,
            graph: msg.payload.graph,
          });
          done();
        });
      });
    });
    describe('opening a node', () => {
      let nodeMenuOption;
      it('should show a menu on right click on a node', () => waitForElement('noflo-ui the-graph-editor the-graph g.nodes g.node')
        .then((node) => {
          syn.rightClick(node);
        })
        .then(() => waitForElement('noflo-ui the-graph-editor the-graph g.context g.context-slice'))
        .then((element) => {
          nodeMenuOption = element;
        }));
      it('should contain a clickable "open" option', () => {
        const elementText = nodeMenuOption.querySelector('text.context-arc-icon-label');
        chai.expect(elementText.innerHTML).to.equal('open');
        syn.click(nodeMenuOption);
      });
      it('should trigger the "loading" indicator', () => waitForElement('noflo-ui noflo-alert.show span')
        .then((loader) => {
          chai.expect(loader.innerText).to.equal('loading');
        }));
      it('should request source code for the component', (done) => {
        rtIframe.contentWindow.handleProtocolMessage((msg, send) => {
          chai.expect(msg.protocol).to.equal('component');
          chai.expect(msg.command).to.equal('getsource');
          chai.expect(msg.payload.name).to.equal('foo/bar');
          send('component', 'source', {
            code: JSON.stringify(graphDefinition),
            language: 'json',
            library: 'foo',
            name: 'bar',
          });
          rtIframe.contentWindow.handleProtocolMessage((msg2, send2) => {
            chai.expect(msg2.protocol).to.equal('component');
            chai.expect(msg2.command).to.equal('list');
            sendComponents(msg2, send2, () => {
              rtIframe.contentWindow.handleProtocolMessage((msg3, send3) => {
                chai.expect(msg3.protocol).to.equal('component');
                chai.expect(msg3.command).to.equal('getsource');
                chai.expect(msg3.payload.name).to.equal('core/Repeat');
                send3('component', 'source', {
                  code: 'hello, world',
                  language: 'javascript',
                  library: 'core',
                  name: 'Repeat',
                });
                done();
              });
            });
          });
        });
      });
      it('should show the source code in the editor', () => waitForElement('noflo-ui noflo-component-editor #code .CodeMirror-lines')
        .then((element) => {
          chai.expect(element.innerText).to.contain('hello, world');
        }));
    });
  });
});
