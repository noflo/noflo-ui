const noflo = require('noflo');

const buildContext = (url) => {
  const routeData = {
    route: '',
    subroute: 'open',
    runtime: null,
    project: null,
    graph: null,
    component: null,
    nodes: [],
  };

  if (url === '') {
    routeData.route = 'main';
    return routeData;
  }

  const urlParts = url.split('/').map(part => decodeURIComponent(part));
  const route = urlParts.shift();
  switch (route) {
    case 'project': {
      // Locally stored project
      routeData.route = 'storage';
      routeData.project = urlParts.shift();
      if ((urlParts[0] === 'component') && (urlParts.length === 2)) {
        // Opening a component from the project
        [, routeData.component] = urlParts;
        return routeData;
      }
      // Opening a graph from the project
      routeData.graph = urlParts.shift();
      routeData.nodes = urlParts;
      return routeData;
    }
    case 'example': {
      return {
        route: 'redirect',
        url: `gist/${urlParts.join('/')}`,
      };
    }
    case 'gist': {
      // Example graph to be fetched from gists
      routeData.route = 'github';
      routeData.subroute = 'gist';
      routeData.graph = urlParts.shift();
      routeData.remote = urlParts;
      return routeData;
    }
    case 'github': {
      // Project to download and open from GitHub
      routeData.route = 'github';
      const [owner, repo] = urlParts.splice(0, 2);
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
          [, routeData.graph] = urlParts;
        }
        if (urlParts[0] === 'components') {
          [, routeData.component] = urlParts;
        }
      }
      return routeData;
    }
    case 'runtime': {
      // Graph running on a remote runtime
      routeData.route = 'runtime';
      routeData.runtime = urlParts.shift();
      routeData.nodes = urlParts;
      return routeData;
    }
    default: {
      // No route matched, redirect to main screen
      return {
        route: 'redirect',
        url: '',
      };
    }
  }
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('route',
    { datatype: 'object' });
  c.outPorts.add('redirect',
    { datatype: 'string' });
  c.outPorts.add('missed',
    { datatype: 'bang' });

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: ['route', 'redirect', 'missed'],
    forwardGroups: false,
    async: true,
  },
  (action, groups, out, callback) => {
    const ctx = buildContext(action.payload);
    if (!ctx) {
      out.missed.send({ payload: ctx });
      callback();
      return;
    }

    if (ctx.route === 'redirect') {
      out.redirect.send(`#${ctx.url}`);
      callback();
      return;
    }

    const newAction = `${ctx.route}:${ctx.subroute}`;
    delete ctx.subroute;
    out.route.send({
      newAction,
      payload: ctx,
    });
    callback();
  });
};
