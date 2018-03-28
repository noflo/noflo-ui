noflo = require 'noflo'

handleSignal = (signal, rtId, output) ->
  if signal.command is 'error'
    signal.payload.runtime = rtId
    output.send
      error:
        payload: signal.payload

  switch "#{signal.protocol}:#{signal.command}"
    when 'component:component'
      output.send
        component:
          component: signal.payload
          runtime: rtId
    when 'network:started'
      output.send
        started:
          status: signal.payload
          runtime: rtId
    when 'network:stopped'
      output.send
        stopped:
          status: signal.payload
          runtime: rtId
    when 'network:begingroup'
      signal.payload.type = 'openBracket'
      output.send
        packet:
          packet: signal.payload
          runtime: rtId
    when 'network:data'
      signal.payload.type = 'data'
      output.send
        packet:
          packet: signal.payload
          runtime: rtId
    when 'network:endgroup'
      signal.payload.type = 'closeBracket'
      output.send
        packet:
          packet: signal.payload
          runtime: rtId
    when 'network:output'
      output.send
        output:
          output: signal.payload
          runtime: rtId
    when 'network:error'
      output.send
        networkerror:
          error: signal.payload
          runtime: rtId
    when 'network:processerror'
      output.send
        processerror:
          error: signal.payload
          runtime: rtId
    when 'network:icon'
      output.send
        icon:
          icon: signal.payload
          runtime: rtId

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    description: 'Runtime client instance'
    datatype: 'object'
  c.outPorts.add 'status',
    description: 'Runtime status change'
    datatype: 'object'
  c.outPorts.add 'components',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'object'
  c.outPorts.add 'started',
    datatype: 'object'
  c.outPorts.add 'stopped',
    datatype: 'object'
  c.outPorts.add 'packet',
    datatype: 'object'
  c.outPorts.add 'output',
    datatype: 'object'
  c.outPorts.add 'icon',
    datatype: 'object'
  c.outPorts.add 'networkerror',
    datatype: 'object'
  c.outPorts.add 'processerror',
    datatype: 'object'
  c.outPorts.add 'protocolerror',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.clients = {}
  unsubscribe = (id) ->
    return unless c.clients[id]
    c.clients[id].client.removeListener 'connected', c.clients[id].onConnected
    c.clients[id].client.transport.removeListener 'status', c.clients[id].onStatus
    c.clients[id].client.removeListener 'signal', c.clients[id].onSignal
    c.clients[id].client.removeListener 'protocolError', c.clients[id].onProtocolError
    c.clients[id].context.deactivate()
    delete c.clients[id]
  c.tearDown = (callback) ->
    for id, client of c.clients
      unsubscribe id
    do callback
  c.process (input, output, context) ->
    return unless input.hasData 'in'
    client = input.getData 'in'

    id = client.definition.id

    # Unsubscribe previous instance
    unsubscribe id

    c.clients[id] =
      context: context
      client: client
      onConnected: () ->
        return unless client.canSend('component', 'list')
        setTimeout ->
          client.protocol.component.list()
            .then(((components) ->
              output.send
                components:
                  components: components
                  runtime: id
            ), ((err) ->
              err.runtime = id
              output.send
                error: err
            ))
        , 1
      onStatus: (status) ->
        output.send
          status:
            status: status
            runtime: id
      onSignal: (signal) ->
        handleSignal signal, id, output
      onProtocolError: (err) ->
        err.runtime = id
        output.send
          protocolerror: err

    client.on 'connected', c.clients[id].onConnected
    client.transport.on 'status', c.clients[id].onStatus
    client.on 'signal', c.clients[id].onSignal
    client.on 'protocolError', c.clients[id].onProtocolError
