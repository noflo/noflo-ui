console.time('noflo-ui-init');
console.time('polymer-ready');


window.addEventListener('polymer-ready', function() {
  var noflo = require('noflo');
  var runtime = require('noflo-runtime-webrtc');

  var baseDir = '/noflo-ui';
  var mainGraph = 'noflo-ui/graphs/main.fbp';

  var loadGraphs = function(callback) {
    noflo.graph.loadJSON(require(mainGraph), function (g) {
      g.baseDir = baseDir;
      noflo.createNetwork(g, function (n) {
        n.on('process-error', function (err) {
          console.log(err);
        });
        return callback();
      });
    });
  };
  var loadGraphsDebuggable = function(callback) {
    noflo.graph.loadJSON(require(mainGraph), function (graph) {
      graph.baseDir = baseDir;
      var runtimeOptions = {
        defaultGraph: graph,
        baseDir: graph.baseDir
      };
      var rt = runtime(null, runtimeOptions, true);
      rt.start();
      var ide = 'http://app.flowhub.io';
      ide = 'http://localhost:8000/index.html'; // TEMP
      var debugUrl = ide+'#runtime/endpoint?'+encodeURIComponent('protocol=webrtc&address='+rt.signaller+'#'+rt.id);
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

  console.timeEnd('polymer-ready');
  document.body.classList.remove('loading');
  window.nofloStarted = false;
  console.time('noflo-prepare');
  var load = (true) ? loadGraphsDebuggable : loadGraphs;
  load(function() {
      console.timeEnd('noflo-prepare');
      console.timeEnd('noflo-ui-init');
  });
});
