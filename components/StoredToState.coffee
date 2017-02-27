noflo = require 'noflo'

getId = (type, entity) ->
  if type is 'component'
    return entity.name
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
    type = groups[0]
    switch type
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

    out.send data.state
    do callback
