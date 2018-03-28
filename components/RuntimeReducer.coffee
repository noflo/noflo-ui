noflo = require 'noflo'
CircularBuffer = require 'circular-buffer'
{ componentForLibrary } = require '../src/runtime'
collections = require '../src/collections'

addRuntimeEvent = (state, runtime, event, payload) ->
  runtimeEvents = state.runtimeEvents or {}
  return runtimeEvents unless runtime
  unless runtimeEvents[runtime]
    # TODO: Make event buffer size configurable
    runtimeEvents[runtime] = new CircularBuffer 400
  runtimeEvents[runtime].enq
    type: event
    payload: payload
  return runtimeEvents

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
        events = data.state.runtimeEvents or {}
        if runtimeStatuses[data.payload.runtime] or data.payload.status.online
          event = if data.payload.status.online then 'connected' else 'disconnected'
          events = addRuntimeEvent data.state, data.payload.runtime, event, data.payload.status
        runtimeStatuses[data.payload.runtime] = data.payload.status
        ctx =
          runtimeStatuses: runtimeStatuses
          runtimeEvents: events
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
        events = addRuntimeEvent data.state, data.payload.runtime, 'started', data.payload.status
        output.sendDone
          context:
            runtimeExecutions: runtimeExecutions
            runtimeEvents: events
      when 'runtime:stopped'
        runtimeExecutions = data.state.runtimeExecutions or {}
        runtimeExecutions[data.payload.runtime] = data.payload.status
        runtimeExecutions[data.payload.runtime].running = false
        runtimeExecutions[data.payload.runtime].label = 'not running'
        events = addRuntimeEvent data.state, data.payload.runtime, 'stopped', data.payload.status
        output.sendDone
          context:
            runtimeExecutions: runtimeExecutions
            runtimeEvents: events
      when 'runtime:packet'
        runtimePackets = data.state.runtimePackets or {}
        unless runtimePackets[data.payload.runtime]
          # TODO: Make packet buffer size configurable?
          runtimePackets[data.payload.runtime] = new CircularBuffer 400
        runtimePackets[data.payload.runtime].enq data.payload.packet
        output.sendDone
          context:
            runtimePackets: runtimePackets
      when 'runtime:processerror'
        events = addRuntimeEvent data.state, data.payload.runtime, 'processerror', data.payload.error
        output.sendDone
          context:
            runtimeEvents: events
      when 'runtime:networkerror'
        events = addRuntimeEvent data.state, data.payload.runtime, 'networkerror', data.payload.error
        output.sendDone
          context:
            runtimeEvents: events
      when 'runtime:output'
        events = addRuntimeEvent data.state, data.payload.runtime, 'output', data.payload.output
        output.sendDone
          context:
            runtimeEvents: events
      when 'runtime:error'
        events = addRuntimeEvent data.state, data.payload.runtime, 'error', data.payload
        state =
          state: 'error'
          error: data.payload
          runtimeEvents: events
        output.sendDone
          context: state
        return
