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
  list.forEach((existing) => {
    if (existing === entity) {
      // Entity is already in list as-is, skip
      found = true;
      return;
    }
    const existingId = (existing.properties != null ? existing.properties.id : undefined)
      || existing.id || existing.name;
    const entityId = (entity.properties != null ? entity.properties.id : undefined)
      || entity.id || entity.name;
    if (existingId === entityId) {
      // id match, replace
      const exists = existing;
      Object.keys(entity).forEach((key) => {
        exists[key] = entity[key];
      });
      found = true;
    }
  });
  if (found) { return; }
  list.push(entity);
  // Sort the list on desired criteria
  list.sort(sort);
};

exports.removeFromList = (list, entity) => {
  const matched = list.find((existing) => {
    if (existing === entity) {
      return true;
    }
    const existingId = (existing.properties != null ? existing.properties.id : undefined)
      || existing.id;
    const entityId = (entity.properties != null ? entity.properties.id : undefined) || entity.id;
    return (existingId === entityId);
  });
  if (!matched) {
    return;
  }
  list.splice(list.indexOf(matched), 1);
};
