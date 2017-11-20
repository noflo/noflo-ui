exports.sortByName = (a, b) ->
  aName = a.properties?.name or a.name or a.id or 'Unknown'
  bName = b.properties?.name or b.name or b.id or 'Unknown'
  aName.localeCompare bName

exports.sortBySeen = (a, b) ->
  unless a.seen
    return 1
  unless b.seen
    return -1
  aSeen = if typeof a.seen is 'object' then a.seen else new Date a.seen
  bSeen = if typeof b.seen is 'object' then b.seen else new Date b.seen
  if a.seen > b.seen
    return -1
  if b.seen > a.seen
    return 1
  0

exports.addToList = (list, entity, sort) ->
  found = false
  for existing in list
    if existing is entity
      # Entity is already in list as-is, skip
      return
    existingId = existing.properties?.id or existing.id
    entityId = entity.properties?.id or entity.id
    if existingId is entityId
      # id match, replace
      for key of entity
        continue unless entity.hasOwnProperty(key)
        existing[key] = entity[key]
      found = true
      break
  return if found
  list.push entity
  unless sort
    # Keep lists in alphabetical order
    sort = exports.sortByName
  # Sort the list on desired criteria
  list.sort sort
  return

exports.removeFromList = (list, entity) ->
  index = null
  for existing, idx in list
    if existing is entity
      index = idx
      continue
    existingId = existing.properties?.id or existing.id
    entityId = entity.properties?.id or entity.id
    if existingId is entityId
      index = idx
      continue
  return if index is null
  list.splice index, 1
  return
