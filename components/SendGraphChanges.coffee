noflo = require 'noflo'
{ getGraphType } = require '../src/runtime'

preparePayload = (event, original, graph) ->
  payload = {}
  for key, val of original
    if key is 'from' and (event.indexOf('edge') isnt -1 or event.indexOf('initial') isnt -1)
      payload.src = val
      continue
    if key is 'to' and (event.indexOf('edge') isnt -1 or event.indexOf('initial') isnt -1)
      payload.tgt = val
      continue
    if key is 'metadata' and event in ['removenode', 'removeedge', 'removeinitial', 'removeinport', 'removeoutport', 'removegroup']
      continue
    if key in ['node', 'port'] and event in ['removeinport', 'removeoutport']
      continue
    if key is 'component' and event in ['changenode', 'removenode']
      continue
    if key is 'metadata' and val
      payload.metadata = {}
      for metaKey, metaVal of val
        if metaKey is 'route' and metaVal is null
          continue
        payload.metadata[metaKey] = metaVal
    payload[key] = val
  payload.graph = graph.name or graph.properties.id
  return payload

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'project',
    datatype: 'object'
  c.inPorts.add 'client',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in', 'project', 'client'
    [data, project, client] = input.getData 'in', 'project', 'client'

    graphType = getGraphType data.graph
    if graphType and graphType isnt client.definition.type
      # Ignore graphs for different runtime type
      output.done()
      return

    # There are several types of graph changes that we don't have protocol events for
    relevantChanges = data.changes.map((c) ->
      c.event = c.event.toLowerCase()
      return c
    ).filter (c) -> client.protocol.graph[c.event]

    client.connect()
      .then(() ->
        Promise.all(relevantChanges.map((change) ->
          client.protocol.graph[change.event] preparePayload change.event, change.payload, data.graph
        ))
      )
      .then((() -> output.done()), (err) -> output.done(err))
