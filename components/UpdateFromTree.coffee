noflo = require 'noflo'
octo = require 'octo'

githubGet = (url, token, callback) ->
  api = octo.api()
  api.token token
  request = api.get url
  request.on 'success', (res) ->
    unless res.body
      callback new Error 'No result received'
      return
    callback null, res.body
  request.on 'error', (err) ->
    callback err.body
  do request

getTree = (repo, tree, token, callback) ->
  githubGet "/repos/#{repo}/git/trees/#{tree}", token, callback

processTree = (basePath, tree, entries, repo, token, out, callback) ->
  subTrees = []
  handled = []
  for entry in tree.tree
    entry.fullPath = "#{basePath}#{entry.path}"
    if entry.type is 'tree'
      subTrees.push entry
      continue

    for localEntry in entries
      unless entry.fullPath is localEntry.path
        continue unless entry.fullPath is localEntry.path.replace('\.fbp', '.json')
      if localEntry.type is 'graph'
        localEntry.local.properties.sha = entry.sha
        localEntry.local.properties.changed = false
        handled.push localEntry
        out.graph.send localEntry.local
        continue
      localEntry.local.sha = entry.sha
      localEntry.local.changed = false
      handled.push localEntry
      if localEntry.type is 'spec'
        out.spec.send localEntry.local
        continue
      out.component.send localEntry.local

  for found in handled
    entries.splice entries.indexOf(found), 1

  return callback() if entries.length is 0

  subTrees.forEach (subTree) ->
    getTree repo, subTree.sha, token, (err, sTree) ->
      return callback err if err
      processTree "#{subTree.fullPath}/", sTree, entries, repo, token, out, callback

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'tree',
    datatype: 'object'
  c.inPorts.add 'repository',
    datatype: 'string'
  c.inPorts.add 'token',
    datatype: 'string'
    description: 'GitHub API token'
    required: true
  c.outPorts.add 'graph',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'object'
  c.outPorts.add 'spec',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: ['in', 'tree', 'repository']
    params: 'token'
    out: ['graph', 'component', 'spec']
    async: true
  , (data, groups, out, callback) ->
    return callback() unless data.tree.tree
    return callback() unless data.in.push?.length

    processTree '', data.tree, data.in.push, data.repository, c.params.token, out, callback

  c
