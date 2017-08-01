var exported = {
  noflo: require('noflo'),
  underscore: require('underscore'),
  'coffee-script': require('coffee-script'),
  'child_process': null,
  'uuid': require('uuid'),
  'flowhub-registry': require('flowhub-registry'),
  'fbp-protocol-client': require('fbp-protocol-client'),
  'fbp-spec': require('fbp-spec'),
  'noflo-ui/src/JournalStore': require('../src/JournalStore'),
  'noflo-ui/runtimeinfo': require('../runtimeinfo/index.coffee'),
  'noflo-ui/collections': require('../src/collections.coffee'),
  'noflo-ui/projects': require('../src/projects.coffee'),
  'the-graph': require('the-graph'),
};

window.TheGraph = exported['the-graph']; // expected by the-graph Polymer elements

window.require = function (moduleName) {
  if (typeof exported[moduleName] !== 'undefined') {
    return exported[moduleName];
  }
  throw new Error('Module ' + moduleName + ' not available');
};

window.addEventListener('WebComponentsReady', function() {
  var noflo = require('noflo');
  var runtime = require('noflo-runtime-webrtc');

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
          console.error(err.error);
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
      var rt = runtime(null, runtimeOptions, true);
      rt.start();
      var ide = 'http://app.flowhub.io';
      var debugUrl = ide+'#runtime/endpoint?'+encodeURIComponent('protocol=webrtc&address='+rt.signaller+'#'+rt.id+'&secret='+secret);
      var debugLink = document.getElementById('flowhub_debug_url');
      if (debugLink) {
        debugLink.href = debugUrl;
      } else {
        console.log(debugUrl);
      }
      rt.network.on('addnetwork', function () {
        return callback();
      });
    });
  };

  window.nofloStarted = false;
  var load = (false) ? loadGraphsDebuggable : loadGraphs;
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
