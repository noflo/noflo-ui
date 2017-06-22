exports.addToList = (list, entity) ->
  found = false
  for existing in list
    if existing is entity
      # Entity is already in list as-is, skip
      return
    if existing.id is entity.id
      # id match, replace
      for key of entity
        continue unless entity.hasOwnProperty(key)
        existing[key] = entity[key]
      found = true
      break
  return if found
  list.push entity
  return

exports.removeFromList = (list, entity) ->
  index = null
  for existing, idx in list
    if existing is entity
      index = idx
      continue
    if existing.id is entity.id
      index = idx
      continue
  return if index is null
  list.splice index, 1
  return
