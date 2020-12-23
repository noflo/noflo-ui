const noflo = require('noflo');
const urlParser = require('url');

const downloadAvatar = (avatarUrl, callback) => {
  if (!avatarUrl) {
    callback(null, null);
    return;
  }

  const req = new XMLHttpRequest();
  const fileReader = new FileReader();
  req.open('GET', avatarUrl, true);
  req.responseType = 'blob';
  req.onload = () => {
    if (req.status !== 200) {
      return callback(new Error(`Avatar request returned ${req.status}`));
    }
    fileReader.onload = (event) => callback(null, event.target.result);
    return fileReader.readAsDataURL(req.response);
  };
  req.onerror = () => callback(new Error('Avatar request failed'));
  req.send();
};

const cleanUpUrl = (output) => {
  const url = urlParser.parse(window.location.href);
  // Clear query params, if any
  delete url.search;
  const newUrl = urlParser.format(url);
  if (newUrl === url) {
    output.done();
    return;
  }
  if (window.history != null ? window.history.replaceState : undefined) {
    // We can manipulate URL without reloading page
    window.history.replaceState({}, 'clear', url.pathname);
    output.done();
    return;
  }
  // Old-school redirect
  output.sendDone({
    redirect: newUrl,
  });
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('user',
    { datatype: 'object' });
  c.outPorts.add('user',
    { datatype: 'object' });
  c.outPorts.add('redirect',
    { datatype: 'string' });
  return c.process((input, output) => {
    const user = input.getData('user');
    const plan = (user.plan != null ? user.plan.type : undefined) || 'free';
    const githubToken = (user.github != null ? user.github.token : undefined) || '';
    const githubUsername = (user.github != null ? user.github.username : undefined) || '';

    downloadAvatar(user.avatar, (err, avatar) => {
      const userData = {
        'flowhub-avatar': avatar,
        'flowhub-plan': plan,
        'flowhub-token': githubToken,
        'flowhub-user': JSON.stringify(user),
        'github-token': githubToken,
        'github-username': githubUsername,
      };

      if (!avatar) { delete userData['flowhub-avatar']; }

      Object.keys(userData).forEach((key) => {
        const val = userData[key];
        localStorage.setItem(key, val);
      });

      userData['flowhub-user'] = user;
      output.send({
        user: userData,
      });
      cleanUpUrl(output);
    });
  });
};
