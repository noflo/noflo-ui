const noflo = require('noflo');

const handleSignal = (s, rtId, output) => {
  const signal = s;
  if (signal.command === 'error') {
    signal.payload.runtime = rtId;
    output.send({
      error: {
        payload: signal.payload,
      },
    });
  }

  switch (`${signal.protocol}:${signal.command}`) {
    case 'component:component':
      output.send({
        component: {
          component: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:started':
      output.send({
        started: {
          status: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:stopped':
      output.send({
        stopped: {
          status: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:begingroup':
      signal.payload.type = 'openBracket';
      output.send({
        packet: {
          packet: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:data':
      signal.payload.type = 'data';
      output.send({
        packet: {
          packet: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:endgroup':
      signal.payload.type = 'closeBracket';
      output.send({
        packet: {
          packet: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:output':
      output.send({
        output: {
          output: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:error':
      output.send({
        networkerror: {
          error: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:processerror':
      output.send({
        processerror: {
          error: signal.payload,
          runtime: rtId,
        },
      });
      return;
    case 'network:icon':
      output.send({
        icon: {
          icon: signal.payload,
          runtime: rtId,
        },
      });
      break;
    default:
      // Unknown signal. Error?
  }
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in', {
    description: 'Runtime client instance',
    datatype: 'object',
  });
  c.outPorts.add('runtimeupdate',
    { datatype: 'object' });
  c.outPorts.add('status', {
    description: 'Runtime status change',
    datatype: 'object',
  });
  c.outPorts.add('components',
    { datatype: 'object' });
  c.outPorts.add('component',
    { datatype: 'object' });
  c.outPorts.add('started',
    { datatype: 'object' });
  c.outPorts.add('stopped',
    { datatype: 'object' });
  c.outPorts.add('packet',
    { datatype: 'object' });
  c.outPorts.add('output',
    { datatype: 'object' });
  c.outPorts.add('icon',
    { datatype: 'object' });
  c.outPorts.add('networkerror',
    { datatype: 'object' });
  c.outPorts.add('processerror',
    { datatype: 'object' });
  c.outPorts.add('protocolerror',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  c.clients = {};
  const unsubscribe = (id) => {
    if (!c.clients[id]) { return; }
    c.clients[id].client.removeListener('connected', c.clients[id].onConnected);
    c.clients[id].client.transport.removeListener('status', c.clients[id].onStatus);
    c.clients[id].client.removeListener('signal', c.clients[id].onSignal);
    c.clients[id].client.removeListener('protocolError', c.clients[id].onProtocolError);
    c.clients[id].context.deactivate();
    delete c.clients[id];
  };
  c.tearDown = (callback) => {
    Object.keys(c.clients).forEach((id) => {
      unsubscribe(id);
    });
    callback();
  };
  return c.process((input, output, context) => {
    if (!input.hasData('in')) { return; }
    const client = input.getData('in');

    const { id } = client.definition;

    // Unsubscribe previous instance
    unsubscribe(id);

    c.clients[id] = {
      context,
      client,
      onConnected() {
        if (!client.canSend('component', 'list')) { return; }
        setTimeout(() => client.protocol.component.list()
          .then((components => output.send({
            components: {
              components,
              runtime: id,
            },
          })
          ), ((e) => {
            const err = e;
            err.runtime = id;
            output.send({ error: err });
          })),

        1);
      },
      onStatus(status) {
        client.definition.seen = new Date();
        output.send({
          status: {
            status,
            runtime: id,
          },
          runtimeupdate: client.definition,
        });
      },
      onSignal(signal) {
        handleSignal(signal, id, output);
      },
      onProtocolError(err) {
        output.send({
          protocolerror: {
            error: err,
            runtime: id,
          },
        });
      },
    };

    client.on('connected', c.clients[id].onConnected);
    client.transport.on('status', c.clients[id].onStatus);
    client.on('signal', c.clients[id].onSignal);
    client.on('protocolError', c.clients[id].onProtocolError);
  });
};
