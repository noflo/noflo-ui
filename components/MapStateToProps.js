const noflo = require('noflo');

// Build up display model of runtime from runtime definition and status
const populateRuntime = function(state) {
  if (!(state.runtime != null ? state.runtime.id : undefined)) {
    return null;
  }
  if (!state.runtimeStatuses) { state.runtimeStatuses = {}; }
  if (!state.runtimeExecutions) { state.runtimeExecutions = {}; }
  const runtime = {
    definition: state.runtime,
    status: state.runtimeStatuses[state.runtime.id] || {},
    execution: state.runtimeExecutions[state.runtime.id] || {
      running: false,
      label: 'not started'
    }
  };
  return runtime;
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.description = 'Map application state to UI properties';
  c.inPorts.add('state', {
    datatype: 'object',
    description: 'Full application state'
  }
  );
  c.inPorts.add('updated', {
    datatype: 'object',
    description: 'Updated application state values'
  }
  );
  c.outPorts.add('props',
    {datatype: 'object'});
  return c.process(function(input, output) {
    if (!input.hasData('state', 'updated')) { return; }
    const [state, updated] = Array.from(input.getData('state', 'updated'));
    const props = {};
    Object.keys(updated).forEach(function(key) {
      switch (key) {
        case 'runtime':
          if (state.runtime != null ? state.runtime.id : undefined) {
            props.runtime = populateRuntime(state);
            return;
          }
          // Clear runtime informations from view when disconnected
          props.runtime = updated.runtime;
          props.componentLibrary = [];
          props.packets = [];
          props.events = [];
          props.edges = [];
          props.icons = {};
          return;
        case 'componentLibraries':
          // Filter UI components to current runtime
          if (!(state.runtime != null ? state.runtime.id : undefined)) { return; }
          props.componentLibrary = updated[key][state.runtime.id] || [];
          return;
        case 'runtime':
          props.runtime = populateRuntime(state);
          return;
        case 'runtimeStatuses':
          props.runtime = populateRuntime(state);
          return;
        case 'runtimeExecutions':
          props.runtime = populateRuntime(state);
          return;
        case 'runtimePackets':
          if (!(state.runtime != null ? state.runtime.id : undefined)) { return; }
          if (!updated.runtimePackets[state.runtime.id]) {
            props.packets = [];
            return;
          }
          var packets = updated.runtimePackets[state.runtime.id].toarray();
          packets.reverse();
          props.packets = packets.filter(p => p.graph === (state.graphs[0].name || state.graphs[0].properties.id));
          return;
        case 'runtimeEvents':
          if (!(state.runtime != null ? state.runtime.id : undefined)) { return; }
          if (!updated.runtimeEvents[state.runtime.id]) {
            props.events = [];
            return;
          }
          var events = updated.runtimeEvents[state.runtime.id].toarray();
          events.reverse();
          props.events = events;
          return;
        case 'runtimeIcons':
          if (!(state.runtime != null ? state.runtime.id : undefined)) { return; }
          props.icons = {};
          if (!updated.runtimeIcons[state.runtime.id]) { return; }
          if (!(state.graphs != null ? state.graphs.length : undefined)) { return; }
          var currentGraph = state.graphs[state.graphs.length - 1];
          var graphId = currentGraph.name || currentGraph.properties.id;
          if (!updated.runtimeIcons[state.runtime.id][graphId]) { return; }
          for (let nodeId in updated.runtimeIcons[state.runtime.id][graphId]) {
            const icon = updated.runtimeIcons[state.runtime.id][graphId][nodeId];
            props.icons[nodeId] = icon;
          }
          return;
        default:
          return props[key] = updated[key];
      }});
    return output.sendDone({
      props});
  });
};
