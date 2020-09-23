const { basename } = require('path');

exports.sortByName = (a, b) => {
  const aName = exports.unnamespace(exports.getName(a));
  const bName = exports.unnamespace(exports.getName(b));
  return aName.localeCompare(bName);
};

exports.getName = (obj, allowUnknown = true) => {
  const name = (obj.properties != null ? obj.properties.name : undefined) || obj.name || obj.id;
  if (!name && allowUnknown) {
    return 'Unknown';
  }
  return name;
};

exports.unnamespace = (name) => {
  if (name.indexOf('/') === -1) {
    return name;
  }
  return basename(name);
};

exports.namespace = (name, namespace) => {
  if (name.indexOf('/') !== -1) {
    return name;
  }
  return `${namespace}/${name}`;
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
    const existingId = exports.unnamespace(exports.getName(existing, false));
    const entityId = exports.unnamespace(exports.getName(entity, false));
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
    const existingId = exports.unnamespace(exports.getName(existing, false));
    const entityId = exports.unnamespace(exports.getName(entity, false));
    return (existingId === entityId);
  });
  if (!matched) {
    return;
  }
  list.splice(list.indexOf(matched), 1);
};
