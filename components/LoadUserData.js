const noflo = require('noflo');

const validate = function(items, callback) {
  if (!items['flowhub-user']) { return callback(null, items); }
  try {
    items['flowhub-user'] = JSON.parse(items['flowhub-user']);
  } catch (e) {
    return callback(e);
  }
  return callback(null, items);
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('start',
    {datatype: 'bang'});
  c.outPorts.add('user', () => ({datatype: 'object'}));
  c.outPorts.add('error', () => ({datatype: 'object'}));

  return noflo.helpers.WirePattern(c, {
    in: 'start',
    out: 'user',
    async: true
  }
  , function(ins, groups, out, callback) {
    // Handle obsolete keys
    let key;
    const deprecated = {
      'grid-avatar': 'flowhub-avatar',
      'grid-token': 'flowhub-token',
      'grid-user': 'flowhub-user'
    };
    for (key in deprecated) {
      const newKey = deprecated[key];
      const val = localStorage.getItem(key);
      if (!val) { continue; }
      localStorage.setItem(newKey, val);
      localStorage.removeItem(key);
    }

    const keys = [
      'flowhub-avatar',
      'flowhub-debug',
      'flowhub-plan',
      'flowhub-theme',
      'flowhub-token',
      'flowhub-user',
      'github-token',
      'github-username'
    ];
    const items = {};
    for (key of Array.from(keys)) {
      items[key] = localStorage.getItem(key);
    }

    return validate(items, function(err, valid) {
      if (err) { return callback(err); }
      out.send(valid);
      return callback();
    });
  });
};
