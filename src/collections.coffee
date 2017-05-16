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
