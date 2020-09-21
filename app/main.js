const noflo = require('noflo');
const underscore = require('underscore');
const { v4: uuid } = require('uuid');
const fbpSpec = require('fbp-spec');
const theGraph = require('the-graph');
const postMessageRuntime = require('noflo-runtime-postmessage');
const journalStore = require('../src/JournalStore');
const runtimeInfo = require('../runtimeinfo/index');
const collections = require('../src/collections');
const projects = require('../src/projects');
const runtime = require('../src/runtime');
const icons = require('../src/icons');
const urls = require('../src/urls');
const mainGraph = require('../graphs/main.fbp');

const exported = {
  noflo,
  underscore,
  uuid,
  'fbp-spec': fbpSpec,
  'the-graph': theGraph,
  'noflo-ui/src/JournalStore': journalStore,
  'noflo-ui/runtimeinfo': runtimeInfo,
  'noflo-ui/collections': collections,
  'noflo-ui/projects': projects,
  'noflo-ui/runtime': runtime,
  'noflo-ui/icons': icons,
  'noflo-ui/urls': urls,
};


window.React = require('react');
window.ReactDOM = require('react-dom');

window.TheGraph = exported['the-graph']; // expected by the-graph Polymer elements

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
