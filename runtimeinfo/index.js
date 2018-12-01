const msgflo = require('./msgflo.yaml');
const sndflo = require('./sndflo.yaml');
const imgflo = require('./imgflo.yaml');
const noflo = require('./noflo.yaml');
const javafbp = require('./javafbp.yaml');
const microflo = require('./microflo.yaml');

const info = {
  msgflo,
  sndflo,
  imgflo,
  noflo,
  javafbp,
  microflo,
};

info['noflo-browser'] = info.noflo;
info['noflo-gnome'] = info.noflo;
info['noflo-nodejs'] = info.noflo;

module.exports = info;
