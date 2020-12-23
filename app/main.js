const noflo = require('noflo');
const postMessageRuntime = require('noflo-runtime-postmessage');
const mainGraph = require('../graphs/main.fbp');

window.addEventListener('WebComponentsReady', () => {
  function loadGraphs() {
    return noflo.graph
      .loadJSON(mainGraph)
      .then((graph) => noflo.createNetwork(graph))
      .then((network) => {
        network.on('process-error', (processError) => {
          if (typeof console.error === 'function') {
            console.error(processError.error);
          } else {
            console.log(processError.error);
          }
        });
        return network;
      });
  }
  function loadGraphsDebuggable() {
    const secret = Math.random().toString(36).substring(7);
    return noflo.graph
      .loadJSON(mainGraph)
      .then((graph) => {
        const runtimeOptions = {
          defaultGraph: graph,
          baseDir: 'noflo-ui',
          permissions: {},
        };
        runtimeOptions.permissions[secret] = [
          'protocol:component',
          'protocol:runtime',
          'protocol:graph',
          'protocol:network',
          'component:getsource',
          'component:setsource',
        ];
        runtimeOptions.label = process.env.NOFLO_APP_TITLE;
        runtimeOptions.id = '2b487ea3-287b-43f7-b7eb-806f02b402f9';
        runtimeOptions.namespace = 'ui';
        runtimeOptions.repository = 'git+https://github.com/noflo/noflo-ui.git';
        const debugButton = document.createElement('button');
        debugButton.id = 'flowhub_debug_url';
        debugButton.innerText = 'Debug in Flowhub';
        const ide = 'https://app.flowhub.io';
        const debugUrl = `${ide}#runtime/endpoint?${encodeURIComponent(`protocol=opener&address=${window.location.href}&id=${runtimeOptions.id}`)}`;
        debugButton.setAttribute('href', debugUrl);
        document.body.appendChild(debugButton);
        postMessageRuntime.opener(runtimeOptions, debugButton);
        return Promise.resolve();
      });
  }

  window.nofloStarted = false;
  let load = loadGraphs;
  if (String(localStorage.getItem('flowhub-debug')) === 'true') {
    load = loadGraphsDebuggable;
  }
  load()
    .then(() => {
      document.body.classList.remove('loading');
      window.nofloStarted = true;
      setTimeout(() => {
        const loader = document.getElementById('loading');
        document.body.removeChild(loader);
      }, 400);
    }, (err) => {
      console.error(err);
      throw err;
    });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}
