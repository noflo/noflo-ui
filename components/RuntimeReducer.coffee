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

addRuntimePacket = (state, runtime, packet) ->
  runtimePackets = state.runtimePackets or {}
  return runtimeEvents unless runtime
  unless runtimePackets[runtime]
    # TODO: Make packet buffer size configurable?
    runtimePackets[runtime] = new CircularBuffer 400
  delete packet.runtime
  runtimePackets[runtime].enq packet
  return runtimePackets

filterRuntimeEvents = (collection, runtime, filter) ->
  collection = {} unless collection
  return collection unless runtime
  return collection unless collection[runtime]
  events = collection[runtime].toarray().filter filter
  events.reverse()
  collection[runtime] = new CircularBuffer 400
  for event in events
    collection[runtime].enq event
  return collection

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
        if runtimeStatuses[data.payload.runtime]?.online and not data.payload.status.online
          events = addRuntimeEvent data.state, data.payload.runtime, 'disconnected', data.payload.status
        if not runtimeStatuses[data.payload.runtime]?.online and data.payload.status.online
          events = addRuntimeEvent data.state, data.payload.runtime, 'connected', data.payload.status
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
        events = data.state.runtimeEvents or {}
        previousRunning = runtimeExecutions[data.payload.runtime]?.running
        runtimeExecutions[data.payload.runtime] = data.payload.status
        runtimeExecutions[data.payload.runtime].label = 'running'
        unless previousRunning
          events = addRuntimeEvent data.state, data.payload.runtime, 'started', data.payload.status
        unless data.payload.status.running
          runtimeExecutions[data.payload.runtime].label = 'finished'
          events = addRuntimeEvent data.state, data.payload.runtime, 'stopped', data.payload.status
        output.sendDone
          context:
            runtimeExecutions: runtimeExecutions
            runtimeEvents: events
      when 'runtime:stopped'
        runtimeExecutions = data.state.runtimeExecutions or {}
        events = data.state.runtimeEvents or {}
        previousRunning = runtimeExecutions[data.payload.runtime]?.running
        runtimeExecutions[data.payload.runtime] = data.payload.status
        runtimeExecutions[data.payload.runtime].running = false
        runtimeExecutions[data.payload.runtime].label = 'not running'
        if previousRunning
          events = addRuntimeEvent data.state, data.payload.runtime, 'stopped', data.payload.status
        output.sendDone
          context:
            runtimeExecutions: runtimeExecutions
            runtimeEvents: events
      when 'runtime:packet'
        runtimePackets = addRuntimePacket data.state, data.payload.runtime, data.payload.packet
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
      when 'runtime:protocolerror'
        events = addRuntimeEvent data.state, data.payload.runtime, 'protocolerror', data.payload.error
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
        output.sendDone
          context:
            runtimeEvents: events
            state: 'error'
            error: data.payload
        return
      when 'runtime:clearevents'
        runtimeEvents = filterRuntimeEvents data.state.runtimeEvents, data.payload.runtime, (event) ->
          if data.payload.type and event.type isnt data.payload.type
            return true
          if data.payload.graph and event.payload.graph isnt data.payload.graph
            return true
          if data.payload.id and event.payload.id isnt data.payload.id
            return true
          return false
        output.send
          context:
            runtimeEvents: runtimeEvents
      when 'runtime:clearpackets'
        runtimePackets = filterRuntimeEvents data.state.runtimePackets, data.payload.runtime, (event) ->
          if data.payload.type and event.type isnt data.payload.type
            return true
          if data.payload.graph and event.graph isnt data.payload.graph
            return true
          if data.payload.edge?.from
            return true unless event.src
            return true if event.src.node isnt data.payload.edge.from.node
            return true if event.src.port isnt data.payload.edge.from.port
            # TODO: Check index
          if data.payload.edge?.to
            return true unless event.tgt
            return true if event.tgt.node isnt data.payload.edge.to.node
            return true if event.tgt.port isnt data.payload.edge.to.port
            # TODO: Check index
          return false
        output.send
          context:
            runtimePackets: runtimePackets
