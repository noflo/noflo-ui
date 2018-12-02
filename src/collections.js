exports.sortByName = (a, b) => {
  const aName = (a.properties != null ? a.properties.name : undefined) || a.name || a.id || 'Unknown';
  const bName = (b.properties != null ? b.properties.name : undefined) || b.name || b.id || 'Unknown';
  return aName.localeCompare(bName);
};

exports.sortBySeen = (ain, bin) => {
  const a = ain;
  const b = bin;
  if (!a.seen) {
    return 1;
  }
  if (!b.seen) {
    return -1;
  }
  a.seen = typeof a.seen === 'object' ? a.seen : new Date(a.seen);
  b.seen = typeof b.seen === 'object' ? b.seen : new Date(b.seen);
  if (a.seen > b.seen) {
    return -1;
  }
  if (b.seen > a.seen) {
    return 1;
  }
  return 0;
};

exports.addToList = (list, entity, sort = exports.sortByName) => {
  let found = false;
  for (const existing of Array.from(list)) {
    if (existing === entity) {
      // Entity is already in list as-is, skip
      return;
    }
    const existingId = (existing.properties != null ? existing.properties.id : undefined) || existing.id || existing.name;
    const entityId = (entity.properties != null ? entity.properties.id : undefined) || entity.id || entity.name;
    if (existingId === entityId) {
      // id match, replace
      for (const key in entity) {
        if (!entity.hasOwnProperty(key)) { continue; }
        existing[key] = entity[key];
      }
      found = true;
      break;
    }
  }
  if (found) { return; }
  list.push(entity);
  // Sort the list on desired criteria
  list.sort(sort);
};

exports.removeFromList = function (list, entity) {
  let index = null;
  for (let idx = 0; idx < list.length; idx++) {
    const existing = list[idx];
    if (existing === entity) {
      index = idx;
      continue;
    }
    const existingId = (existing.properties != null ? existing.properties.id : undefined) || existing.id;
    const entityId = (entity.properties != null ? entity.properties.id : undefined) || entity.id;
    if (existingId === entityId) {
      index = idx;
      continue;
    }
  }
  if (index === null) { return; }
  list.splice(index, 1);
};
