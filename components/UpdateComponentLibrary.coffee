noflo = require 'noflo'
_ = require 'underscore'

exports.getComponent = ->
  c = new noflo.Component
  c.components = {}
  c.runtime = null
  c.runtimeUpdated = {}

  updateRuntime = _.debounce ->
    return unless c.runtime
    return unless c.components[c.runtime.id]
    c.runtime.components = c.components[c.runtime.id]
    c.outPorts.runtime.beginGroup 'project'
    c.outPorts.runtime.beginGroup 'save'
    c.outPorts.runtime.beginGroup 'runtime'
    c.outPorts.runtime.send c.runtime
    c.outPorts.runtime.endGroup()
    c.outPorts.runtime.endGroup()
    c.outPorts.runtime.endGroup()
    c.outPorts.runtime.disconnect()
  , 300

  c.inPorts.add 'in',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      return unless payload.componentDefinition
      def = payload.componentDefinition
      c.outPorts.out.send payload
      return unless def.runtime
      c.components[def.runtime] = {} unless c.components[def.runtime]

      # Clear component listing from runtime when receiving first
      c.components[def.runtime] = {} unless c.runtimeUpdated[def.runtime]
      c.runtimeUpdated[def.runtime] = true

      c.components[def.runtime][def.name] = def
      do updateRuntime

  c.inPorts.add 'runtime',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      c.outPorts.out.send
        clearLibrary: true
      return unless payload.definition
      return unless payload.definition.id
      c.runtime = payload.definition
      c.runtimeUpdated[payload.definition.id] = false
      return unless c.runtime.components
      return unless typeof c.runtime.components is 'object'
      for name, def of c.runtime.components
        c.outPorts.out.send
          componentDefinition: def

  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'runtime',
    datatype: 'object'

  c.shutdown = ->
    c.components = {}
    c.runtime = null
    c.runtimeUpdated = {}

  c
