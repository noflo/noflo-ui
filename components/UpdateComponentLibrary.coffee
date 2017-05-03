noflo = require 'noflo'

getId = (type, entity) ->
  if type is 'components'
    return entity.name
  if type is 'graph'
    return entity.properties.id or entity.id
  entity.id
addToList = (type, list, entity) ->
  for item in list
    # Entity is already in list as-is, skip
    return if item is entity
    if getId(type, item) is getId(type, entity)
      # ID match, update properties
      for key, val of entity
        item[key] = val
      return
  # No match, add to list
  list.push entity

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    addToList 'components', data.state.workspace.library, data.payload.componentDefinition

    out.send data.state
    do callback
