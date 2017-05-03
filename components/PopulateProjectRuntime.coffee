noflo = require 'noflo'

findRuntimeType = (graphs, project) ->
  if graphs?.length and graphs[0].properties?.environment?.type
    return graphs[0].properties.environment.type
  return project.type

findRuntime = (workspace, runtimes) ->
  fallbackRt = null
  runtimeType = findRuntimeType workspace.graphs, workspace.project
  for rt in runtimes
    if rt.protocol is 'iframe' and runtimeType in ['noflo', 'noflo-browser']
      # For browser projects we can usually fall back to any iframe runtime
      fallbackRt = rt
    # Use specific runtime associated with project
    return rt if rt.project is workspace.project.id
  return fallbackRt

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'connect',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['connect', 'out']
    async: true
  , (data, groups, out, callback) ->
    unless data.payload.project
      # No project set, skip
      out.out.send data
      do callback
      return
    unless data.state.runtimes?.local?.length
      # No runtimes available, skip
      out.out.send data
      do callback
      return

    if data.state.workspace?.runtime?.selected
      # We already have a runtime selected, keep using the connection
      data.payload.runtime = data.state.workspace.runtime.selected
      out.out.send data
      do callback
      return

    # See if there is a runtime configured for this project
    runtime = findRuntime data.payload, data.state.runtimes?.local
    unless runtime
      # No matching runtime found, skip
      out.out.send data
      do callback
      return

    # We need to connect to the new runtime
    out.connect.send runtime
    out.out.send data
    do callback
