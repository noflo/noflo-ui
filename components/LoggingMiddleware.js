const noflo = require('noflo');
const debugAction = require('debug')('noflo-ui:action');
const debugActionFull = require('debug')('noflo-ui:action:full');
const debugError = require('debug')('noflo-ui:error');

const sendEvent = function(label, action, category) {
  if (action == null) { action = 'click'; }
  if (category == null) { category = 'menu'; }
  if (typeof window.ga !== 'function') { return; }
  return window.ga('send', 'event', category, action, label);
};

const registerPageView = function(hash) {
  if (typeof window.ga !== 'function') { return; }
  if (!hash) { return; }
  if (hash.indexOf('?') !== -1) {
    // Don't send connection details
    hash = hash.split('?')[0];
  }
  window.ga('set', 'page', `${window.location.pathname}${window.location.search}#${hash}`);
  return window.ga('send', 'pageview');
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.icon = 'file-text';
  c.inPorts.add('in',
    {datatype: 'all'});
  c.outPorts.add('pass',
    {datatype: 'all'});

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: 'pass',
    forwardGroups: true,
    async: true
  }
  , function(data, groups, out, callback) {
    const { action } = data;
    debugAction(action);
    debugActionFull(action, data.payload);

    if (action.match(/:error$/)) {
      debugError(data.payload);
    }

    switch (action) {
      case 'application:hash':
        registerPageView(data.payload);
        break;
      case 'user:login':
        sendEvent('userLogin');
        break;
      case 'user:logout':
        sendEvent('userLogout');
        break;
      case 'github:open':
        sendEvent('pullGithub', 'navigation', 'url');
        break;
      case 'gist:open':
        sendEvent('pullGist', 'navigation', 'url');
        break;
      case 'main:open':
        sendEvent('openHome', 'navigation', 'url');
        break;
      case 'runtime:start':
        sendEvent('startRuntime', 'click', 'button');
        break;
      case 'runtime:stop':
        sendEvent('stopRuntime', 'click', 'button');
        break;
      case 'runtime:output':
        if (data.payload.output.message) { console.error(data.payload.output.message); }
        break;
      case 'runtime:processerror':
        console.error(data.payload.error.error);
        break;
      case 'runtime:networkerror':
        console.error(data.payload.error);
        break;
      case 'runtime:protocolerror':
        console.error(data.payload.error);
        break;
      case 'runtime:error':
        console.error(data.payload);
        break;
    }

    out.send(data);
    return callback();
  });
};
