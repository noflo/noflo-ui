noflo = require 'noflo'

onRuntimeConnected = null
onRuntimeComponent = null

subscribe = (runtime, port) ->
  onRuntimeConnected = ->
    runtime.sendComponent 'list'
    port.connect()
  onRuntimeComponent = (message) ->
    return unless message.command is 'component'
    return if message.payload.name in ['Graph', 'ReadDocument']
    definition =
      name: message.payload.name
      description: message.payload.description
      icon: message.payload.icon
      subgraph: message.payload.subgraph or false
      inports: []
      outports: []
    for portDef in message.payload.inPorts
      definition.inports.push
        name: portDef.id
        type: portDef.type
        required: portDef.required
        description: portDef.description
        addressable: portDef.addressable
        values: portDef.values
        default: portDef.default
    for portDef in message.payload.outPorts
      definition.outports.push
        name: portDef.id
        type: portDef.type
        required: portDef.required
        description: portDef.description
        addressable: portDef.addressable
    port.send
      componentDefinition: definition

  runtime.on 'connected', onRuntimeConnected
  runtime.on 'component', onRuntimeComponent

unsubscribe = (runtime, port) ->
  port.disconnect()
  runtime.removeListener 'connected', onRuntimeConnected
  runtime.remoteListener 'component', onRuntimeComponent
  onRuntimeConnected = null
  onRuntimeComponent = null

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'List components available on a runtime'
  c.runtime = null
  c.inPorts.add 'runtime',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      unsubscribe c.runtime, c.outPorts.out if c.runtime
      c.runtime = payload
      subscribe c.runtime, c.outPorts.out
  c.outPorts.add 'out',
    datatype: 'object'

  c.shutdown = ->
    unsubscribe c.runtime, c.outPorts.out if c.runtime

  c
