noflo = require 'noflo'

getId = (type, entity) ->
  if type is 'component'
    return entity.name
  if type is 'graph'
    return entity.properties.id or entity.id
  entity.id

removeFromList = (type, list, entityId) ->
  for item, idx in list
    continue unless item
    itemId = getId type, item
    continue unless itemId is entityId
    list.splice idx, 1
  return

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    type = groups[0]
    switch type
      when 'project'
        removeFromList 'project', data.state.projects.local, data.payload
      when 'graph'
        removeFromList 'graph', data.state.graphs.local, data.payload
      when 'component'
        removeFromList 'component', data.state.components.local, data.payload
      when 'spec'
        removeFromList 'spec', data.state.specs.local, data.payload
      when 'runtime'
        removeFromList 'runtime', data.state.runtimes.local, data.payload
    out.send data.state
    do callback
