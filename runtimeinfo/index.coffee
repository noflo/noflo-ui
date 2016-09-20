info =
  msgflo: require('./msgflo.yaml')
  sndflo: require('./sndflo.yaml')
  imgflo: require('./imgflo.yaml')
  noflo: require('./noflo.yaml')

info['noflo-browser'] = info.noflo
info['noflo-nodejs'] = info.noflo

module.exports = info
