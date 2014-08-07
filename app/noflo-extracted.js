console.time('polymer-ready');
window.addEventListener('polymer-ready', function() {
  console.timeEnd('polymer-ready');
  document.body.classList.remove('loading');
  window.nofloStarted = false;

  console.time('noflo-prepare');
  var noflo = require('noflo');
  noflo.graph.loadJSON(require('noflo-ui/graphs/main.fbp'), function (g) {
    g.baseDir = '/noflo-ui';
    noflo.createNetwork(g, function (n) {
      console.timeEnd('noflo-prepare');
    });
  });
});
