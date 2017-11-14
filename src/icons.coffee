exports.getIcon = (iconName, fallback = '') ->
  iconMap = window.TheGraph?.FONT_AWESOME
  unless iconMap
    return iconName
  unless iconMap[iconName]
    return fallback unless fallback
    return iconMap[fallback]
  return iconMap[iconName]

exports.getIcons = ->
  iconMap = window.TheGraph?.FONT_AWESOME
  unless iconMap
    return {}
  iconMap
