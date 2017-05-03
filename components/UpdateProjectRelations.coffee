noflo = require 'noflo'

getId = (type, entity) ->
  if type is 'component'
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

setListContents = (type, list, newEntities) ->
  # First clear list contents
  list.splice 0, list.length
  # Then add entities
  for entity in newEntities
    addToList type, list, entity

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    for project in data.projects.local
      # Ensure project has arrays for related items
      project.graphs = [] unless project.graphs
      project.components = [] unless project.components
      project.specs = [] unless project.specs

      setListContents 'graph', project.graphs, data.graphs.local.filter (item) ->
        item.properties?.project is project.id
      setListContents 'component', project.components, data.components.local.filter (item) ->
        item.project is project.id
      setListContents 'spec', project.specs, data.specs.local.filter (item) ->
        item.project is project.id

    out.send data
    do callback
