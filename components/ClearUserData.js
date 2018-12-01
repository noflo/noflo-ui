const noflo = require('noflo');

exports.getComponent = function () {
  const c = new noflo.Component();
  c.inPorts.add('clear',
    { datatype: 'bang' });
  c.outPorts.add('user', () => ({ datatype: 'object' }));

  return noflo.helpers.WirePattern(c, {
    in: 'clear',
    out: 'user',
    async: true,
  },
  (ins, groups, out, callback) => {
    let key;
    const keys = [
      'flowhub-avatar',
      'flowhub-plan',
      'flowhub-theme',
      'flowhub-token',
      'flowhub-user',
      'github-token',
      'github-username',
    ];
    for (key of Array.from(keys)) {
      localStorage.removeItem(key);
    }
    const newUserInfo = {};
    for (key of Array.from(keys)) {
      newUserInfo[key] = null;
    }
    out.send(newUserInfo);
    return callback();
  });
};
