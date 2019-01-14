const noflo = require('noflo');
const CircularBuffer = require('circular-buffer');
const { componentForLibrary } = require('../src/runtime');
const collections = require('../src/collections');

const addRuntimeEvent = function(state, runtime, event, payload) {
  const runtimeEvents = state.runtimeEvents || {};
  if (!runtime) { return runtimeEvents; }
  if (!runtimeEvents[runtime]) {
    // TODO: Make event buffer size configurable
    runtimeEvents[runtime] = new CircularBuffer(400);
  }
  runtimeEvents[runtime].enq({
    type: event,
    payload
  });
  return runtimeEvents;
};

const addRuntimePacket = function(state, runtime, packet) {
  const runtimePackets = state.runtimePackets || {};
  if (!runtime) { return runtimeEvents; }
  if (!runtimePackets[runtime]) {
    // TODO: Make packet buffer size configurable?
    runtimePackets[runtime] = new CircularBuffer(400);
  }
  delete packet.runtime;
  runtimePackets[runtime].enq(packet);
  return runtimePackets;
};

const filterRuntimeEvents = function(collection, runtime, filter) {
  if (!collection) { collection = {}; }
  if (!runtime) { return collection; }
  if (!collection[runtime]) { return collection; }
  const events = collection[runtime].toarray().filter(filter);
  events.reverse();
  collection[runtime] = new CircularBuffer(400);
  for (let event of Array.from(events)) {
    collection[runtime].enq(event);
  }
  return collection;
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.icon = 'cogs';
  c.inPorts.add('in',
    {datatype: 'object'});
  c.outPorts.add('context',
    {datatype: 'object'});
  return c.process(function(input, output) {
    let runtimeExecutions;
    if (!input.hasData('in')) { return; }
    const data = input.getData('in');
    switch (data.action) {
      case 'runtime:opening':
        output.sendDone({
          context: {
            state: 'loading'
          }
        });
        return;
      case 'runtime:opened':
        output.sendDone({
          context: {
            state: 'ok',
            graphs: data.payload.graphs,
            component: data.payload.component,
            runtime: data.payload.runtime
          }
        });
        return;
      case 'runtime:components':
        var componentLibraries = data.state.componentLibraries || {};
        componentLibraries[data.payload.runtime] = data.payload.components.map(componentForLibrary);
        return output.sendDone({
          context: {
            componentLibraries
          }
        });
      case 'runtime:component':
        componentLibraries = data.state.componentLibraries || {};
        componentLibraries[data.payload.runtime] = componentLibraries[data.payload.runtime] || [];
        collections.addToList(componentLibraries[data.payload.runtime], componentForLibrary(data.payload.component));
        output.sendDone({
          context: {
            componentLibraries
          }
        });
        return;
      case 'runtime:status':
        var runtimeStatuses = data.state.runtimeStatuses || {};
        var events = data.state.runtimeEvents || {};
        if ((runtimeStatuses[data.payload.runtime] != null ? runtimeStatuses[data.payload.runtime].online : undefined) && !data.payload.status.online) {
          events = addRuntimeEvent(data.state, data.payload.runtime, 'disconnected', data.payload.status);
        }
        if (!(runtimeStatuses[data.payload.runtime] != null ? runtimeStatuses[data.payload.runtime].online : undefined) && data.payload.status.online) {
          events = addRuntimeEvent(data.state, data.payload.runtime, 'connected', data.payload.status);
        }
        runtimeStatuses[data.payload.runtime] = data.payload.status;
        var ctx = {
          runtimeStatuses,
          runtimeEvents: events
        };
        if (!data.payload.status.online) {
          // Disconnected, update execution status too
          runtimeExecutions = data.state.runtimeExecutions || {};
          runtimeExecutions[data.payload.runtime] = data.payload.status;
          runtimeExecutions[data.payload.runtime].running = false;
          runtimeExecutions[data.payload.runtime].label = 'not running';
          ctx.runtimeExecutions = runtimeExecutions;
        }
        return output.sendDone({
          context: ctx});
      case 'runtime:started':
        runtimeExecutions = data.state.runtimeExecutions || {};
        events = data.state.runtimeEvents || {};
        var previousRunning = runtimeExecutions[data.payload.runtime] != null ? runtimeExecutions[data.payload.runtime].running : undefined;
        runtimeExecutions[data.payload.runtime] = data.payload.status;
        runtimeExecutions[data.payload.runtime].label = 'running';
        if (!previousRunning) {
          events = addRuntimeEvent(data.state, data.payload.runtime, 'started', data.payload.status);
        }
        if (!data.payload.status.running) {
          runtimeExecutions[data.payload.runtime].label = 'finished';
          events = addRuntimeEvent(data.state, data.payload.runtime, 'stopped', data.payload.status);
        }
        return output.sendDone({
          context: {
            runtimeExecutions,
            runtimeEvents: events
          }
        });
      case 'runtime:stopped':
        runtimeExecutions = data.state.runtimeExecutions || {};
        events = data.state.runtimeEvents || {};
        previousRunning = runtimeExecutions[data.payload.runtime] != null ? runtimeExecutions[data.payload.runtime].running : undefined;
        runtimeExecutions[data.payload.runtime] = data.payload.status;
        runtimeExecutions[data.payload.runtime].running = false;
        runtimeExecutions[data.payload.runtime].label = 'not running';
        if (previousRunning) {
          events = addRuntimeEvent(data.state, data.payload.runtime, 'stopped', data.payload.status);
        }
        return output.sendDone({
          context: {
            runtimeExecutions,
            runtimeEvents: events
          }
        });
      case 'runtime:packet':
        var runtimePackets = addRuntimePacket(data.state, data.payload.runtime, data.payload.packet);
        return output.sendDone({
          context: {
            runtimePackets
          }
        });
      case 'runtime:processerror':
        events = addRuntimeEvent(data.state, data.payload.runtime, 'processerror', data.payload.error);
        return output.sendDone({
          context: {
            runtimeEvents: events
          }
        });
      case 'runtime:networkerror':
        events = addRuntimeEvent(data.state, data.payload.runtime, 'networkerror', data.payload.error);
        return output.sendDone({
          context: {
            runtimeEvents: events
          }
        });
      case 'runtime:protocolerror':
        events = addRuntimeEvent(data.state, data.payload.runtime, 'protocolerror', data.payload.error);
        return output.sendDone({
          context: {
            runtimeEvents: events
          }
        });
      case 'runtime:output':
        events = addRuntimeEvent(data.state, data.payload.runtime, 'output', data.payload.output);
        return output.sendDone({
          context: {
            runtimeEvents: events
          }
        });
      case 'runtime:icon':
        var runtimeIcons = data.state.runtimeIcons || {};
        if (!runtimeIcons[data.payload.runtime]) { runtimeIcons[data.payload.runtime] = {}; }
        if (!runtimeIcons[data.payload.runtime][data.payload.icon.graph]) { runtimeIcons[data.payload.runtime][data.payload.icon.graph] = {}; }
        runtimeIcons[data.payload.runtime][data.payload.icon.graph][data.payload.icon.id] = data.payload.icon.icon;
        return output.sendDone({
          context: {
            runtimeIcons
          }
        });
      case 'runtime:error':
        events = addRuntimeEvent(data.state, data.payload.runtime, 'error', data.payload);
        output.send({
          context: {
            runtimeEvents: events
          }
        });
        output.sendDone({
          context: {
            state: 'error',
            error: data.payload
          }
        });
        return;
      case 'runtime:clearevents':
        var runtimeEvents = filterRuntimeEvents(data.state.runtimeEvents, data.payload.runtime, function(event) {
          if (data.payload.type && (event.type !== data.payload.type)) {
            return true;
          }
          if (data.payload.graph && (event.payload.graph !== data.payload.graph)) {
            return true;
          }
          if (data.payload.id && (event.payload.id !== data.payload.id)) {
            return true;
          }
          return false;
        });
        return output.send({
          context: {
            runtimeEvents
          }
        });
      case 'runtime:clearpackets':
        runtimePackets = filterRuntimeEvents(data.state.runtimePackets, data.payload.runtime, function(event) {
          if (data.payload.type && (event.type !== data.payload.type)) {
            return true;
          }
          if (data.payload.graph && (event.graph !== data.payload.graph)) {
            return true;
          }
          if (data.payload.edge != null ? data.payload.edge.from : undefined) {
            if (!event.src) { return true; }
            if (event.src.node !== data.payload.edge.from.node) { return true; }
            if (event.src.port !== data.payload.edge.from.port) { return true; }
          }
            // TODO: Check index
          if (data.payload.edge != null ? data.payload.edge.to : undefined) {
            if (!event.tgt) { return true; }
            if (event.tgt.node !== data.payload.edge.to.node) { return true; }
            if (event.tgt.port !== data.payload.edge.to.port) { return true; }
          }
            // TODO: Check index
          return false;
        });
        return output.send({
          context: {
            runtimePackets
          }
        });
    }
  });
};
