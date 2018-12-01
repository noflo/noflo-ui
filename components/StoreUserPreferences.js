const noflo = require('noflo');

const validPreferences = [
  'flowhub-theme',
  'flowhub-debug',
];

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('user',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in', 'user')) { return; }
    const [prefs, user] = input.getData('in', 'user');

    const keys = Object.keys(prefs);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const val = prefs[key];
      if (validPreferences.indexOf(key) === -1) {
        output.done(new Error(`${key} is not a valid preference`));
        return;
      }
      localStorage.setItem(key, val);
      user[key] = val;
    }
    output.sendDone({ out: user });
  });
};
