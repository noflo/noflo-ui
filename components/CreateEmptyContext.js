const noflo = require('noflo');

const buildContext = () => ({
  state: '',
});

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'file-o';
  c.inPorts.add('start',
    { datatype: 'bang' });
  c.outPorts.add('out',
    { datatype: 'object' });

  return c.process((input, output) => {
    input.getData('start');
    const ctx = buildContext();
    ctx.state = 'ok';
    output.sendDone({
      out: ctx,
    });
  });
};
