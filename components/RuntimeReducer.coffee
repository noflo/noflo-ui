noflo = require 'noflo'
CircularBuffer = require 'circular-buffer'
{ componentForLibrary } = require '../src/runtime'
collections = require '../src/collections'

exports.getComponent = ->
  c = new noflo.Component
  c.icon = 'cogs'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'context',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    data = input.getData 'in'
    switch data.action
      when 'runtime:opening'
        output.sendDone
          context:
            state: 'loading'
        return
      when 'runtime:opened'
        output.sendDone
          context:
            state: 'ok'
            graphs: data.payload.graphs
            component: data.payload.component
            runtime: data.payload.runtime
        return
      when 'runtime:components'
        componentLibraries = data.state.componentLibraries or {}
        componentLibraries[data.payload.runtime] = data.payload.components.map componentForLibrary
        output.sendDone
          context:
            componentLibraries: componentLibraries
      when 'runtime:component'
        componentLibraries = data.state.componentLibraries or {}
        componentLibraries[data.payload.runtime] = componentLibraries[data.payload.runtime] or []
        collections.addToList componentLibraries[data.payload.runtime], componentForLibrary data.payload.component
        output.sendDone
          context:
            componentLibraries: componentLibraries
        return
      when 'runtime:status'
        runtimeStatuses = data.state.runtimeStatuses or {}
        runtimeStatuses[data.payload.runtime] = data.payload.status
        ctx =
          runtimeStatuses: runtimeStatuses
        unless data.payload.status.online
          # Disconnected, update execution status too
          runtimeExecutions = data.state.runtimeExecutions or {}
          runtimeExecutions[data.payload.runtime] = data.payload.status
          runtimeExecutions[data.payload.runtime].running = false
          runtimeExecutions[data.payload.runtime].label = 'not running'
          ctx.runtimeExecutions = runtimeExecutions
        output.sendDone
          context: ctx
      when 'runtime:started'
        runtimeExecutions = data.state.runtimeExecutions or {}
        runtimeExecutions[data.payload.runtime] = data.payload.status
        runtimeExecutions[data.payload.runtime].label = 'running'
        unless data.payload.status.running
          runtimeExecutions[data.payload.runtime].label = 'finished'
        output.sendDone
          context:
            runtimeExecutions: runtimeExecutions
      when 'runtime:stopped'
        runtimeExecutions = data.state.runtimeExecutions or {}
        runtimeExecutions[data.payload.runtime] = data.payload.status
        runtimeExecutions[data.payload.runtime].running = false
        runtimeExecutions[data.payload.runtime].label = 'not running'
        output.sendDone
          context:
            runtimeExecutions: runtimeExecutions
      when 'runtime:packet'
        runtimePackets = data.state.runtimePackets or {}
        unless runtimePackets[data.payload.runtime]
          # TODO: Make packet buffer size configurable?
          runtimePackets[data.payload.runtime] = new CircularBuffer 400
        runtimePackets[data.payload.runtime].enq data.payload.packet
        output.sendDone
          context:
            runtimePackets: runtimePackets
      when 'runtime:error'
        state =
          state: 'error'
          error: data.payload
        output.sendDone
          context: state
        return
