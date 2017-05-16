exports.addToList = (list, entity) ->
  found = false
  i = 0
  while i < list.length
    if list[i] is entity
      # Entity is already in list as-is, skip
      return
    if list[i].id is entity.id
      # id match, replace
      for key of entity
        unless entity.hasOwnProperty(key)
          i++
          continue
        list[i][key] = entity[key]
      found = true
      break
    i++
  return unless found
  list.push entity
  return
