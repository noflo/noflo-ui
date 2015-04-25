noflo = require 'noflo'

prepareContent = (type, local) ->
  return local.code if type in ['component', 'spec']
  def = local.toJSON()
  delete def.properties.sha
  delete def.properties.id
  delete def.properties.project
  delete def.properties.changed
  JSON.stringify def, null, 4

preparePath = (type, path) ->
  return path unless type is 'graph'
  # We can't generate .fbp, so always push .json
  return path.replace '\.fbp', '.json'

buildTree = (entries) ->
  tree = []
  for entry in entries
    tree.push
      path: preparePath entry.type, entry.path
      content: prepareContent entry.type, entry.local
      mode: '100644'
  tree

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Prepare a GitHub tree for an operations object'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'repository',
    datatype: 'string'
  c.outPorts.add 'tree',
    datatype: 'array'
  c.outPorts.add 'basetree',
    datatype: 'string'
  c.outPorts.add 'parentcommits',
    datatype: 'array'
  c.outPorts.add 'message',
    datatype: 'string'
  c.outPorts.add 'ref',
    datatype: 'string'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['out', 'repository', 'tree', 'basetree', 'parentcommits', 'message', 'ref']
  , (data, groups, out) ->
    return unless data.push?.length

    out.out.send data
    out.basetree.send data.tree
    out.tree.send buildTree data.push
    out.repository.send data.repo
    out.parentcommits.send [data.commit]
    out.message.send data.message
    out.ref.send data.ref
