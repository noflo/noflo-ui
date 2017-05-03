noflo = require 'noflo'

getId = (type, entity) ->
  if type is 'component'
    return entity.name
  if type is 'graph'
    return entity.properties.id or entity.id
  entity.id

clearList = (list) ->
  list.splice 0, list.length
mergeLists = (type, original, newList) ->
  addToList type, original, entity for entity in newList

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
    type = groups[0]
    switch type
      # Initial data
      when 'projects'
        clearList data.state.projects.local
        mergeLists 'project', data.state.projects.local, data.payload
      when 'graphs'
        clearList data.state.graphs.local
        mergeLists 'graph', data.state.graphs.local, data.payload
      when 'components'
        clearList data.state.components.local
        mergeLists 'component', data.state.components.local, data.payload
      when 'specs'
        clearList data.state.specs.local
        mergeLists 'spec', data.state.specs.local, data.payload
      when 'runtimes'
        clearList data.state.runtimes.local
        mergeLists 'runtime', data.state.runtimes.local, data.payload

      # Later additions
      when 'project'
        addToList 'project', data.state.projects.local, data.payload
      when 'graph'
        addToList 'graph', data.state.graphs.local, data.payload
      when 'component'
        addToList 'component', data.state.components.local, data.payload
      when 'spec'
        addToList 'spec', data.state.specs.local, data.payload
      when 'runtime'
        if data.payload.protocol in ['iframe', 'microflo']
          data.payload.seen = Date.now()
        data.payload.seenHoursAgo = Math.floor((Date.now() - new Date(data.payload.seen).getTime()) / (60*60*1000))
        addToList 'runtime', data.state.runtimes.local, data.payload

        if (data.payload.seenHoursAgo / 24) < 31
          # If the runtime has been seen within last month, consider it current
          addToList 'runtime', data.state.runtimes.current, data.payload

    out.send data.state
    do callback
