info =
  msgflo: require('./msgflo.yaml')
  sndflo: require('./sndflo.yaml')
  imgflo: require('./imgflo.yaml')
  noflo: require('./noflo.yaml')
  javafbp: require('./javafbp.yaml')
  microflo: require('./microflo.yaml')

info['noflo-browser'] = info.noflo
info['noflo-gnome'] = info.noflo
info['noflo-nodejs'] = info.noflo

module.exports = info
