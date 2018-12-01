const noflo = require('noflo');

const validPreferences = [
  'flowhub-theme',
  'flowhub-debug'
];

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'object'});
  c.inPorts.add('user',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});
  return c.process(function(input, output) {
    if (!input.hasData('in', 'user')) { return; }
    const [prefs, user] = Array.from(input.getData('in', 'user'));
    for (let key in prefs) {
      const val = prefs[key];
      if (validPreferences.indexOf(key) === -1) {
        output.done(new Error(`${key} is not a valid preference`));
        return;
      }
      localStorage.setItem(key, val);
      user[key] = val;
    }
    return output.sendDone({
      out: user});
  });
};
