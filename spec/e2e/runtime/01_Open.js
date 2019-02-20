const qs = require('querystring');
const { waitForElement } = require('../../utils/ui');

describe('Opening a Runtime', () => {
  let iframe;
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
          iframe = element;
          iframe.contentWindow.handleProtocolMessage((msg, send) => {
            chai.expect(msg.protocol).to.equal('runtime');
            chai.expect(msg.command).to.equal('getruntime');
            send('runtime', 'runtime', {
              id: runtimeDefinition.id,
              type: runtimeDefinition.type,
              capabilities,
              version: '0.7',
            });
            resolve();
          });
        }));
    }).timeout(30000);
  });
});
