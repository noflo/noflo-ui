const noflo = require('noflo');
const CircularBuffer = require('circular-buffer');
const debug = require('debug')('noflo-ui:reducer:runtime');
const { componentForLibrary } = require('../src/runtime');
const collections = require('../src/collections');

const addRuntimeEvent = (state, runtime, event, payload) => {
  const runtimeEvents = state.runtimeEvents || {};
  if (!runtime) { return runtimeEvents; }
  if (!runtimeEvents[runtime]) {
    // TODO: Make event buffer size configurable
    runtimeEvents[runtime] = new CircularBuffer(400);
  }
  runtimeEvents[runtime].enq({
    type: event,
    payload,
  });
  return runtimeEvents;
};

const addRuntimePacket = (state, runtime, p) => {
  const packet = p;
  const runtimePackets = state.runtimePackets || {};
  if (!runtime) { return runtimePackets; }
  if (!runtimePackets[runtime]) {
    // TODO: Make packet buffer size configurable?
    runtimePackets[runtime] = new CircularBuffer(400);
  }
  delete packet.runtime;
  runtimePackets[runtime].enq(packet);
  return runtimePackets;
};

const filterRuntimeEvents = (coll, runtime, filter) => {
  const collection = coll || {};
  if (!runtime) { return collection; }
  if (!collection[runtime]) { return collection; }
  const events = collection[runtime].toarray().filter(filter);
  events.reverse();
  collection[runtime] = new CircularBuffer(400);
  events.forEach((event) => {
    collection[runtime].enq(event);
  });
  return collection;
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'cogs';
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('context',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in')) { return; }
    const data = input.getData('in');
    switch (data.action) {
      case 'runtime:opening': {
        output.sendDone({
          context: {
            state: 'loading',
          },
        });
        return;
      }
      case 'runtime:opened': {
        output.sendDone({
          context: {
            state: 'ok',
            graphs: data.payload.graphs,
            component: data.payload.component,
            runtime: data.payload.runtime,
          },
        });
        return;
      }
      case 'runtime:components': {
        const componentLibraries = data.state.componentLibraries || {};
        componentLibraries[data.payload.runtime] = data.payload.components.map(componentForLibrary);
        output.sendDone({
          context: {
            componentLibraries,
          },
        });
        return;
      }
      case 'runtime:component': {
        const componentLibraries = data.state.componentLibraries || {};
        componentLibraries[data.payload.runtime] = componentLibraries[data.payload.runtime] || [];
        collections.addToList(
          componentLibraries[data.payload.runtime],
          componentForLibrary(data.payload.component),
        );
        output.sendDone({
          context: {
            componentLibraries,
          },
        });
        return;
      }
      case 'runtime:status': {
        const runtimeStatuses = data.state.runtimeStatuses || {};
        const runtimeStatus = runtimeStatuses[data.payload.runtime];
        let events = data.state.runtimeEvents || {};
        if ((runtimeStatus && runtimeStatus.online)
          && !data.payload.status.online) {
          events = addRuntimeEvent(data.state, data.payload.runtime, 'disconnected', data.payload.status);
        }
        if ((!runtimeStatus || !runtimeStatus.online)
          && data.payload.status.online) {
          events = addRuntimeEvent(data.state, data.payload.runtime, 'connected', data.payload.status);
        }
        runtimeStatuses[data.payload.runtime] = data.payload.status;
        const ctx = {
          runtimeStatuses,
          runtimeEvents: events,
        };
        if (!data.payload.status.online) {
          // Disconnected, update execution status too
          const runtimeExecutions = data.state.runtimeExecutions || {};
          runtimeExecutions[data.payload.runtime] = data.payload.status;
          runtimeExecutions[data.payload.runtime].running = false;
          runtimeExecutions[data.payload.runtime].label = 'not running';
          ctx.runtimeExecutions = runtimeExecutions;
        }
        output.sendDone({ context: ctx });
        return;
      }
      case 'runtime:started': {
        const runtimeExecutions = data.state.runtimeExecutions || {};
        let events = data.state.runtimeEvents || {};
        let previousRunning;
        if (runtimeExecutions[data.payload.runtime]) {
          previousRunning = runtimeExecutions[data.payload.runtime].running;
        }
        runtimeExecutions[data.payload.runtime] = data.payload.status;
        runtimeExecutions[data.payload.runtime].label = 'running';
        if (!previousRunning) {
          events = addRuntimeEvent(data.state, data.payload.runtime, 'started', data.payload.status);
        }
        if (!data.payload.status.running) {
          runtimeExecutions[data.payload.runtime].label = 'finished';
          events = addRuntimeEvent(data.state, data.payload.runtime, 'stopped', data.payload.status);
        }
        output.sendDone({
          context: {
            runtimeExecutions,
            runtimeEvents: events,
          },
        });
        return;
      }
      case 'runtime:stopped': {
        const runtimeExecutions = data.state.runtimeExecutions || {};
        let events = data.state.runtimeEvents || {};
        let previousRunning;
        if (runtimeExecutions[data.payload.runtime]) {
          previousRunning = runtimeExecutions[data.payload.runtime].running;
        }
        runtimeExecutions[data.payload.runtime] = data.payload.status;
        runtimeExecutions[data.payload.runtime].running = false;
        runtimeExecutions[data.payload.runtime].label = 'not running';
        if (previousRunning) {
          events = addRuntimeEvent(data.state, data.payload.runtime, 'stopped', data.payload.status);
        }
        output.sendDone({
          context: {
            runtimeExecutions,
            runtimeEvents: events,
          },
        });
        return;
      }
      case 'runtime:packet': {
        const runtimePackets = addRuntimePacket(
          data.state,
          data.payload.runtime,
          data.payload.packet,
        );
        output.sendDone({
          context: {
            runtimePackets,
          },
        });
        return;
      }
      case 'runtime:processerror': {
        const events = addRuntimeEvent(data.state, data.payload.runtime, 'processerror', data.payload.error);
        output.sendDone({
          context: {
            runtimeEvents: events,
          },
        });
        return;
      }
      case 'runtime:networkerror': {
        const events = addRuntimeEvent(data.state, data.payload.runtime, 'networkerror', data.payload.error);
        output.sendDone({
          context: {
            runtimeEvents: events,
          },
        });
        return;
      }
      case 'runtime:protocolerror': {
        const events = addRuntimeEvent(data.state, data.payload.runtime, 'protocolerror', data.payload.error);
        output.sendDone({
          context: {
            runtimeEvents: events,
          },
        });
        return;
      }
      case 'runtime:output': {
        const events = addRuntimeEvent(data.state, data.payload.runtime, 'output', data.payload.output);
        output.sendDone({
          context: {
            runtimeEvents: events,
          },
        });
        return;
      }
      case 'runtime:icon': {
        const runtimeIcons = data.state.runtimeIcons || {};
        if (!runtimeIcons[data.payload.runtime]) { runtimeIcons[data.payload.runtime] = {}; }
        if (!runtimeIcons[data.payload.runtime][data.payload.icon.graph]) {
          runtimeIcons[data.payload.runtime][data.payload.icon.graph] = {};
        }
        const icons = runtimeIcons[data.payload.runtime][data.payload.icon.graph];
        icons[data.payload.icon.id] = data.payload.icon.icon;
        output.sendDone({
          context: {
            runtimeIcons,
          },
        });
        return;
      }
      case 'runtime:error': {
        const events = addRuntimeEvent(data.state, data.payload.runtime, 'error', data.payload);
        output.send({
          context: {
            runtimeEvents: events,
          },
        });
        output.sendDone({
          context: {
            state: 'error',
            error: data.payload,
          },
        });
        return;
      }
      case 'runtime:clearevents': {
        const runtimeEvents = filterRuntimeEvents(
          data.state.runtimeEvents,
          data.payload.runtime,
          (event) => {
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
          },
        );
        output.send({
          context: {
            runtimeEvents,
          },
        });
        return;
      }
      case 'runtime:clearpackets': {
        const runtimePackets = filterRuntimeEvents(
          data.state.runtimePackets,
          data.payload.runtime,
          (event) => {
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
          },
        );
        output.send({
          context: {
            runtimePackets,
          },
        });
        return;
      }
      default: {
        debug(`Unknown action ${data.action}`);
      }
    }
  });
};
