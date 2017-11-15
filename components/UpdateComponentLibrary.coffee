noflo = require 'noflo'
_ = require 'underscore'

# Debounce runtime saving so we don't do it more often than needed
updateRuntime = _.debounce (runtime, output) ->
  # Send updated runtime definition to storage
  runtime.runtime.definition.seen = Date.now()
  output.send
    runtime:
      action: 'storage:save:runtime'
      payload: runtime.runtime.definition
  # Deactivate all running contexts
  while runtime.contexts.length
    ctx = runtime.contexts.shift()
    ctx.deactivate()
, 300

exports.getComponent = ->
  c = new noflo.Component
  c.components = {}
  c.runtime = null
  c.runtimeUpdated = {}
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'runtime',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'runtime',
    datatype: 'object'
  c.runtimes = {}
  c.tearDown = (callback) ->
    c.runtimes = {}
    do callback
  c.forwardBrackets = {}
  c.process (input, output, context) ->
    if input.hasData 'in'
      # New or updated component definition from runtime
      payload = input.getData 'in'
      unless payload.componentDefinition
        output.done()
        return

      def = payload.componentDefinition

      if def.runtime and c.runtimes[def.runtime] and not c.runtimes[def.runtime].updated
        # Clear component listing from runtime when receiving first
        output.send
          out:
            clearLibrary: true
        c.runtimes[def.runtime].runtime.definition.components = {}
        c.runtimes[def.runtime].updated = true

      # Send updated component definition out
      output.send
        out:
          componentDefinition: def

      unless def.runtime
        output.done()
        return
      unless c.runtimes[def.runtime]
        output.done()
        return

      # Add this component to the listing
      c.runtimes[def.runtime].runtime.definition.components[def.name] = def

      # Add this activation context so it can be deactivated
      c.runtimes[def.runtime].contexts.push context

      updateRuntime c.runtimes[def.runtime], output
      return

    if input.hasData 'runtime'
      payload = input.getData 'runtime'

      # New runtime connection, start with fresh library
      output.send
        out:
          clearLibrary: true

      unless payload.definition?.id
        # Non-persistent runtime, we have no further information for it
        output.done()
        return

      # Keep runtime definition so it can be updated when we receive components
      c.runtimes[payload.definition.id] =
        runtime: payload
        updated: false
        contexts: []

      unless typeof payload.definition.components is 'object'
        # No cached component information available
        output.done()
        return

      # Send previously cached components to have a starting point
      for name, def of payload.definition.components
        output.send
          out:
            componentDefinition: def

      output.done()
      return
