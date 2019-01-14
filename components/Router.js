const noflo = require('noflo');

const buildContext = function(url) {
  let ctx;
  const routeData = {
    route: '',
    subroute: 'open',
    runtime: null,
    project: null,
    graph: null,
    component: null,
    nodes: []
  };

  if (url === '') {
    routeData.route = 'main';
    return routeData;
  }

  const urlParts = url.split('/').map(part => decodeURIComponent(part));
  const route = urlParts.shift();
  switch (route) {
    case 'project':
      // Locally stored project
      routeData.route = 'storage';
      routeData.project = urlParts.shift();
      if ((urlParts[0] === 'component') && (urlParts.length === 2)) {
        // Opening a component from the project
        routeData.component = urlParts[1];
        return routeData;
      }
      // Opening a graph from the project
      routeData.graph = urlParts.shift();
      routeData.nodes = urlParts;
      return routeData;
      break;
    case 'example':
      return ctx = {
        route: 'redirect',
        url: `gist/${urlParts.join('/')}`
      };
      break;
    case 'gist':
      // Example graph to be fetched from gists
      routeData.route = 'github';
      routeData.subroute = 'gist';
      routeData.graph = urlParts.shift();
      routeData.remote = urlParts;
      return routeData;
      break;
    case 'github':
      // Project to download and open from GitHub
      routeData.route = 'github';
      var [owner, repo] = Array.from(urlParts.splice(0, 2));
      routeData.repo = `${owner}/${repo}`;
      routeData.branch = 'master';
      if (!urlParts.length) { return routeData; }
      if (urlParts[0] === 'tree') {
        // Opening a particular branch
        urlParts.shift();
        routeData.branch = urlParts.join('/');
        return routeData;
      }
      if (urlParts[0] === 'blob') {
        // Opening a particular file
        urlParts.shift();
        routeData.branch = urlParts.shift();
        if (urlParts[0] === 'graphs') {
          routeData.graph = urlParts[1];
        }
        if (urlParts[0] === 'components') {
          routeData.component = urlParts[1];
        }
      }
      return routeData;
      break;
    case 'runtime':
      // Graph running on a remote runtime
      routeData.route = 'runtime';
      routeData.runtime = urlParts.shift();
      routeData.nodes = urlParts;
      return routeData;
      break;
  }

  // No route matched, redirect to main screen
  return ctx = {
    route: 'redirect',
    url: ''
  };
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'object'});
  c.outPorts.add('route',
    {datatype: 'object'});
  c.outPorts.add('redirect',
    {datatype: 'string'});
  c.outPorts.add('missed',
    {datatype: 'bang'});

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: ['route', 'redirect', 'missed'],
    forwardGroups: false,
    async: true
  }
  , function(action, groups, out, callback) {
    const ctx = buildContext(action.payload);
    if (!ctx) {
      out.missed.send({
        payload: ctx});
      return callback();
    }

    if (ctx.route === 'redirect') {
      out.redirect.send(`#${ctx.url}`);
      return callback();
    }

    action = `${ctx.route}:${ctx.subroute}`;
    delete ctx.subroute;
    out.route.send({
      action,
      payload: ctx
    });
    return callback();
  });
};
