var exported = {
  noflo: require('noflo'),
  underscore: require('underscore'),
  'uuid': require('uuid'),
  'fbp-spec': require('fbp-spec'),
  'noflo-ui/src/JournalStore': require('../src/JournalStore'),
  'noflo-ui/runtimeinfo': require('../runtimeinfo/index.coffee'),
  'noflo-ui/collections': require('../src/collections.coffee'),
  'noflo-ui/projects': require('../src/projects.coffee'),
  'noflo-ui/icons': require('../src/icons.coffee'),
  'the-graph': require('the-graph')
};


window.React = require('react');
window.ReactDOM = require('react-dom');
window.TheGraph = exported['the-graph']; // expected by the-graph Polymer elements

window.require = function (moduleName) {
  if (typeof exported[moduleName] !== 'undefined') {
    return exported[moduleName];
  }
  throw new Error('Module ' + moduleName + ' not available');
};

window.addEventListener('WebComponentsReady', function() {
  var noflo = require('noflo');
  var runtime = require('noflo-runtime-postmessage');

  var baseDir = '/noflo-ui';
  var mainGraph = require('../graphs/main.fbp');

  var loadGraphs = function(callback) {
    noflo.graph.loadJSON(mainGraph, function (err, g) {
      if (err) {
        callback(err);
        return;
      }
      g.baseDir = baseDir;
      noflo.createNetwork(g, function (err, n) {
        if (err) {
          callback(err);
          return;
        }
        n.on('process-error', function (err) {
          if (typeof console.error === 'function') {
            console.error(err.error);
          } else {
            console.log(err.error);
          }
        });
        return callback();
      });
    });
  };
  var loadGraphsDebuggable = function(callback) {
    var secret = Math.random().toString(36).substring(7);
    noflo.graph.loadJSON(mainGraph, function (err, graph) {
      if (err) {
        callback(err);
        return;
      }
      graph.baseDir = baseDir;
      var runtimeOptions = {
        defaultGraph: graph,
        baseDir: graph.baseDir,
        permissions: {}
      };
      runtimeOptions.permissions[secret] = [
        'protocol:component',
        'protocol:runtime',
        'protocol:graph',
        'protocol:network',
        'component:getsource',
        'component:setsource'
      ];
      runtimeOptions.label = '$NOFLO_APP_TITLE';
      runtimeOptions.id = '2b487ea3-287b-43f7-b7eb-806f02b402f9'
      runtimeOptions.namespace = 'ui';
      runtimeOptions.repository = 'git+https://github.com/noflo/noflo-ui.git'
      var debugButton = document.createElement('button');
      debugButton.id = 'flowhub_debug_url';
      debugButton.innerText = 'Debug in Flowhub';
      var ide = 'https://app.flowhub.io';
      var debugUrl = ide+'#runtime/endpoint?'+encodeURIComponent('protocol=opener&address='+window.location.href + '&id=' + runtimeOptions.id);
      debugButton.setAttribute('href', debugUrl);
      document.body.appendChild(debugButton);
      runtime.opener(runtimeOptions, debugButton);
      return callback();
    });
  };

  window.nofloStarted = false;
  load = loadGraphs;
  if (String(localStorage.getItem('flowhub-debug')) === 'true') {
    load = loadGraphsDebuggable;
  }
  load(function(err) {
    if (err) {
      throw err;
    }
    document.body.classList.remove('loading');
    window.nofloStarted = true;
    setTimeout(function () {
      var loader = document.getElementById('loading');
      document.body.removeChild(loader);
    }, 400);
  });
});
