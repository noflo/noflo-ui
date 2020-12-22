const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('clear', {
    datatype: 'bang',
  });
  c.outPorts.add('user', {
    datatype: 'object',
  });

  return c.process((input, output) => {
    input.getData('clear');
    const keys = [
      'flowhub-avatar',
      'flowhub-plan',
      'flowhub-theme',
      'flowhub-token',
      'flowhub-user',
      'github-token',
      'github-username',
    ];
    const newUserInfo = {};
    keys.forEach((key) => {
      localStorage.removeItem(key);
      newUserInfo[key] = null;
    });
    output.sendDone({
      user: newUserInfo,
    });
  });
};
