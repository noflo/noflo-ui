const noflo = require('noflo');
const uuid = require('uuid');

const sendPulls = (pulls, repo, scope, output, callback) => {
  if (!pulls.length) {
    callback();
    return;
  }
  const entry = pulls.shift();
  if (!entry.remote) {
    sendPulls(pulls, repo, scope, output, callback);
    return;
  }
  output.send({
    repository: new noflo.IP('data', repo,
      { scope }),
    sha: new noflo.IP('data', entry.remote.sha,
      { scope }),
  });
  // Don't fire all requests at once, some of them may get
  // cancelled by server
  setTimeout(() => sendPulls(pulls, repo, scope, output, callback),
    100);
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Prepare a set of blob fetching requests for an operations object';
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('repository',
    { datatype: 'string' });
  c.outPorts.add('sha',
    { datatype: 'string' });
  return c.process((input, output) => {
    if (!input.hasData('in')) { return; }
    const data = input.getData('in');
    if (data.pull.length === 0) {
      output.done();
      return;
    }
    const scope = uuid.v4();
    output.send({
      out: new noflo.IP('data', data,
        { scope }),
    });

    output.send({
      sha: new noflo.IP('openBracket', scope,
        { scope }),
    });
    const pulls = data.pull.slice(0);
    sendPulls(pulls, data.repo, scope, output, () => {
      output.send({
        sha: new noflo.IP('closeBracket', scope,
          { scope }),
      });
      output.done();
    });
  });
};
