const noflo = require('noflo');
const urlParser = require('url');

const downloadAvatar = function(avatarUrl, callback) {
  if (!avatarUrl) { return callback(null, null); }

  const req = new XMLHttpRequest;
  const fileReader = new FileReader;
  req.open('GET', avatarUrl, true);
  req.responseType = 'blob';
  req.onload = function(e) {
    if (req.status !== 200) {
      return callback(new Error(`Avatar request returned ${req.status}`));
    }
    fileReader.onload = event => callback(null, event.target.result);
    return fileReader.readAsDataURL(req.response);
  };
  req.onerror = () => callback(new Error('Avatar request failed'));
  return req.send();
};

const cleanUpUrl = function(out, callback) {
  const url = urlParser.parse(window.location.href);
  // Clear query params, if any
  delete url.search;
  const newUrl = urlParser.format(url);
  if (newUrl === url) { return callback(); }
  if (window.history != null ? window.history.replaceState : undefined) {
    // We can manipulate URL without reloading page
    window.history.replaceState({}, 'clear', url.pathname);
    return callback();
  }
  // Old-school redirect
  out.send(newUrl);
  callback();
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('user',
    {datatype: 'object'});
  c.outPorts.add('user',
    {datatype: 'object'});
  c.outPorts.add('redirect',
    {datatype: 'string'});

  return noflo.helpers.WirePattern(c, {
    in: 'user',
    out: ['user', 'redirect'],
    async: true
  }
  , function(user, groups, out, callback) {

    const plan = (user.plan != null ? user.plan.type : undefined) || 'free';
    const githubToken = (user.github != null ? user.github.token : undefined) || '';
    const githubUsername = (user.github != null ? user.github.username : undefined) || '';

    return downloadAvatar(user.avatar, function(err, avatar) {
      const userData = {
        'flowhub-avatar': avatar,
        'flowhub-plan': plan,
        'flowhub-token': githubToken,
        'flowhub-user': JSON.stringify(user),
        'github-token': githubToken,
        'github-username': githubUsername
      };

      if (!avatar) { delete userData['flowhub-avatar']; }

      for (let key in userData) {
        const val = userData[key];
        localStorage.setItem(key, val);
      }

      userData['flowhub-user'] = user;
      out.user.send(userData);
      return cleanUpUrl(out.redirect, callback);
    });
  });
};
