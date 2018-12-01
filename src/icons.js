exports.getIcon = function (iconName, fallback) {
  if (fallback == null) { fallback = ''; }
  const iconMap = window.TheGraph != null ? window.TheGraph.FONT_AWESOME : undefined;
  if (!iconMap) {
    return iconName;
  }
  if (!iconMap[iconName]) {
    if (!fallback) { return fallback; }
    return iconMap[fallback];
  }
  return iconMap[iconName];
};

exports.getIcons = function () {
  const iconMap = window.TheGraph != null ? window.TheGraph.FONT_AWESOME : undefined;
  if (!iconMap) {
    return {};
  }
  return iconMap;
};
