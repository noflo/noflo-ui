const noflo = require('noflo');

const validate = (i, callback) => {
  const items = i;
  if (!items['flowhub-user']) {
    callback(null, items);
    return;
  }
  try {
    items['flowhub-user'] = JSON.parse(items['flowhub-user']);
  } catch (e) {
    callback(e);
    return;
  }
  callback(null, items);
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('start',
    { datatype: 'bang' });
  c.outPorts.add('user', () => ({ datatype: 'object' }));
  c.outPorts.add('error', () => ({ datatype: 'object' }));

  return noflo.helpers.WirePattern(c, {
    in: 'start',
    out: 'user',
    async: true,
  },
  (ins, groups, out, callback) => {
    // Handle obsolete keys
    const deprecated = {
      'grid-avatar': 'flowhub-avatar',
      'grid-token': 'flowhub-token',
      'grid-user': 'flowhub-user',
    };
    Object.keys(deprecated).forEach((key) => {
      const newKey = deprecated[key];
      const val = localStorage.getItem(key);
      if (!val) { return; }
      localStorage.setItem(newKey, val);
      localStorage.removeItem(key);
    });

    const keys = [
      'flowhub-avatar',
      'flowhub-debug',
      'flowhub-plan',
      'flowhub-theme',
      'flowhub-token',
      'flowhub-user',
      'github-token',
      'github-username',
    ];
    const items = {};
    keys.forEach((key) => {
      items[key] = localStorage.getItem(key);
    });

    validate(items, (err, valid) => {
      if (err) {
        callback(err);
        return;
      }
      out.send(valid);
      callback();
    });
  });
};
