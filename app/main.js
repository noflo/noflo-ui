const noflo = require('noflo');
const postMessageRuntime = require('noflo-runtime-postmessage');
const mainGraph = require('../graphs/main.fbp');
require('../elements/noflo-polymer');
require('../elements/noflo-ui');

window.React = require('react');
window.ReactDOM = require('react-dom');
window.TheGraph = require('the-graph'); // expected by the-graph Polymer elements

const exported = {
  noflo,
};
window.require = function (moduleName) {
  if (typeof exported[moduleName] !== 'undefined') {
    return exported[moduleName];
  }
  throw new Error(`Module ${moduleName} not available`);
};

window.addEventListener('WebComponentsReady', () => {
  const loadGraphs = function (callback) {
    noflo.graph.loadJSON(mainGraph, (err, g) => {
      if (err) {
        callback(err);
        return;
      }
      noflo.createNetwork(g, (err2, n) => {
        if (err2) {
          callback(err2);
          return;
        }
        n.on('process-error', (processError) => {
          if (typeof console.error === 'function') {
            console.error(processError.error);
          } else {
            console.log(processError.error);
          }
        });
        callback();
      });
    });
  };
  const loadGraphsDebuggable = function (callback) {
    const secret = Math.random().toString(36).substring(7);
    noflo.graph.loadJSON(mainGraph, (err, graph) => {
      if (err) {
        callback(err);
        return;
      }
      const runtimeOptions = {
        defaultGraph: graph,
        baseDir: graph.baseDir,
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
      runtimeOptions.label = '$NOFLO_APP_TITLE';
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
      callback();
    });
  };

  window.nofloStarted = false;
  let load = loadGraphs;
  if (String(localStorage.getItem('flowhub-debug')) === 'true') {
    load = loadGraphsDebuggable;
  }
  load((err) => {
    if (err) {
      throw err;
    }
    document.body.classList.remove('loading');
    window.nofloStarted = true;
    setTimeout(() => {
      const loader = document.getElementById('loading');
      document.body.removeChild(loader);
    }, 400);
  });
});
