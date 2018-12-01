const noflo = require('noflo');

const handleSignal = function(signal, rtId, output) {
  if (signal.command === 'error') {
    signal.payload.runtime = rtId;
    output.send({
      error: {
        payload: signal.payload
      }
    });
  }

  switch (`${signal.protocol}:${signal.command}`) {
    case 'component:component':
      return output.send({
        component: {
          component: signal.payload,
          runtime: rtId
        }
      });
    case 'network:started':
      return output.send({
        started: {
          status: signal.payload,
          runtime: rtId
        }
      });
    case 'network:stopped':
      return output.send({
        stopped: {
          status: signal.payload,
          runtime: rtId
        }
      });
    case 'network:begingroup':
      signal.payload.type = 'openBracket';
      return output.send({
        packet: {
          packet: signal.payload,
          runtime: rtId
        }
      });
    case 'network:data':
      signal.payload.type = 'data';
      return output.send({
        packet: {
          packet: signal.payload,
          runtime: rtId
        }
      });
    case 'network:endgroup':
      signal.payload.type = 'closeBracket';
      return output.send({
        packet: {
          packet: signal.payload,
          runtime: rtId
        }
      });
    case 'network:output':
      return output.send({
        output: {
          output: signal.payload,
          runtime: rtId
        }
      });
    case 'network:error':
      return output.send({
        networkerror: {
          error: signal.payload,
          runtime: rtId
        }
      });
    case 'network:processerror':
      return output.send({
        processerror: {
          error: signal.payload,
          runtime: rtId
        }
      });
    case 'network:icon':
      return output.send({
        icon: {
          icon: signal.payload,
          runtime: rtId
        }
      });
  }
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in', {
    description: 'Runtime client instance',
    datatype: 'object'
  }
  );
  c.outPorts.add('runtimeupdate',
    {datatype: 'object'});
  c.outPorts.add('status', {
    description: 'Runtime status change',
    datatype: 'object'
  }
  );
  c.outPorts.add('components',
    {datatype: 'object'});
  c.outPorts.add('component',
    {datatype: 'object'});
  c.outPorts.add('started',
    {datatype: 'object'});
  c.outPorts.add('stopped',
    {datatype: 'object'});
  c.outPorts.add('packet',
    {datatype: 'object'});
  c.outPorts.add('output',
    {datatype: 'object'});
  c.outPorts.add('icon',
    {datatype: 'object'});
  c.outPorts.add('networkerror',
    {datatype: 'object'});
  c.outPorts.add('processerror',
    {datatype: 'object'});
  c.outPorts.add('protocolerror',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});
  c.clients = {};
  const unsubscribe = function(id) {
    if (!c.clients[id]) { return; }
    c.clients[id].client.removeListener('connected', c.clients[id].onConnected);
    c.clients[id].client.transport.removeListener('status', c.clients[id].onStatus);
    c.clients[id].client.removeListener('signal', c.clients[id].onSignal);
    c.clients[id].client.removeListener('protocolError', c.clients[id].onProtocolError);
    c.clients[id].context.deactivate();
    return delete c.clients[id];
  };
  c.tearDown = function(callback) {
    for (let id in c.clients) {
      const client = c.clients[id];
      unsubscribe(id);
    }
    return callback();
  };
  return c.process(function(input, output, context) {
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
        return setTimeout(() =>
          client.protocol.component.list()
            .then((components =>
              output.send({
                components: {
                  components,
                  runtime: id
                }})
            ), (function(err) {
              err.runtime = id;
              return output.send({
                error: err});
            }))
        
        , 1);
      },
      onStatus(status) {
        client.definition.seen = new Date;
        return output.send({
          status: {
            status,
            runtime: id
          },
          runtimeupdate: client.definition
        });
      },
      onSignal(signal) {
        return handleSignal(signal, id, output);
      },
      onProtocolError(err) {
        return output.send({
          protocolerror: {
            error: err,
            runtime: id
          }
        });
      }
    };

    client.on('connected', c.clients[id].onConnected);
    client.transport.on('status', c.clients[id].onStatus);
    client.on('signal', c.clients[id].onSignal);
    return client.on('protocolError', c.clients[id].onProtocolError);
  });
};
