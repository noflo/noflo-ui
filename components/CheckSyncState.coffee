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

getCommit = (repo, sha, token, callback) ->
  githubGet "/repos/#{repo}/git/commits/#{sha}", token, callback

processGraphsTree = (tree, objects, prefix) ->
  return unless tree
  graphs = tree.tree.filter (entry) ->
    return false unless entry.type is 'blob'
    return false unless entry.path.match '.*\.(fbp|json)$'
    true
  graphs = graphs.filter (entry) ->
    # If we have .json and .fbp for same graph, .json wins
    return true if entry.path.indexOf('.fbp') is -1
    jsonVersion = entry.path.replace '\.fbp', '.json'
    for g in graphs
      return false if g.path is jsonVersion
    true
  objects.graphs = objects.graphs.concat graphs.map (entry) ->
    entry.name = entry.path.substr 0, entry.path.indexOf '.'
    entry.language = entry.path.substr entry.path.lastIndexOf('.') + 1
    entry.fullPath = "#{prefix}#{entry.path}"
    entry

processComponentsTree = (tree, objects, prefix) ->
  return unless tree
  components = tree.tree.filter (entry) ->
    return false unless entry.type is 'blob'
    return false unless entry.path.match '.*\.(coffee|js|hpp|c|py)$'
    true
  objects.components = objects.components.concat components.map (entry) ->
    entry.name = entry.path.substr 0, entry.path.indexOf '.'
    language = entry.path.substr entry.path.lastIndexOf('.') + 1
    switch language
      when 'coffee' then entry.language = 'coffeescript'
      when 'js' then entry.language = 'javascript'
      when 'hpp' then entry.language = 'c++'
      when 'c' then entry.language = 'c'
      when 'py' then entry.language = 'python'
      else entry.language = language
    entry.fullPath = "#{prefix}#{entry.path}"
    entry

processSpecsTree = (tree, objects, prefix) ->
  return unless tree
  specs = tree.tree.filter (entry) ->
    return false unless entry.type is 'blob'
    return false unless entry.path.match '.*\.(yaml|coffee)$'
    true
  objects.specs = objects.specs.concat specs.map (entry) ->
    entry.name = entry.path.substr 0, entry.path.indexOf '.'
    entry.type = 'spec'
    language = entry.path.substr entry.path.lastIndexOf('.') + 1
    switch language
      when 'coffee' then entry.language = 'coffeescript'
      else entry.language = language
    entry.fullPath = "#{prefix}#{entry.path}"
    entry

getRemoteObjects = (repo, sha, token, callback) ->
  getCommit repo, sha, token, (err, commit) ->
    return callback err if err
    unless commit
      return callback new Error "No commit found for #{repo} #{sha}"
    getTree repo, commit.tree.sha, token, (err, rootTree) ->
      return callback err if err

      graphsSha = null
      componentsSha = null
      specsSha = null
      remoteObjects =
        tree: commit.tree.sha
        graphs: []
        components: []
        specs: []
      for entry in rootTree.tree
        if entry.path is 'fbp.json' and entry.type is 'blob'
          return callback new Error 'fbp.json support is pending standardization'
        if entry.path is 'graphs' and entry.type is 'tree'
          graphsSha = entry.sha
          continue
        if entry.path is 'components' and entry.type is 'tree'
          componentsSha = entry.sha
          continue
        if entry.path is 'spec' and entry.type is 'tree'
          specsSha = entry.sha
          continue

      if graphsSha
        getTree repo, graphsSha, token, (err, graphsTree) ->
          return callback err if err
          processGraphsTree graphsTree, remoteObjects, 'graphs/'
          return callback null, remoteObjects unless componentsSha
          getTree repo, componentsSha, token, (err, componentsTree) ->
            return callback err if err
            processComponentsTree componentsTree, remoteObjects, 'components/'
            return callback null, remoteObjects unless specsSha
            getTree repo, specsSha, token, (err, specsTree) ->
              return callback err if err
              processSpecsTree specsTree, remoteObjects, 'spec/'
              return callback null, remoteObjects
        return

      if componentsSha
        getTree repo, componentsSha, token, (err, componentsTree) ->
          return callback err if err
          processComponentsTree componentsTree, remoteObjects, 'components/'
          return callback null, remoteObjects unless specsSha
          getTree repo, specsSha, token, (err, specsTree) ->
            return callback err if err
            processSpecsTree specsTree, remoteObjects, 'spec/'
            return callback null, remoteObjects
        return

      if specsSha
        getTree repo, specsSha, token, (err, specsTree) ->
          return callback err if err
          processSpecsTree specsTree, remoteObjects, 'spec/'
          return callback null, remoteObjects
        return

      # No graphs or components on the remote
      return callback null, remoteObjects

normalizeName = (name) ->
  name.replace /\s/g, '_'

createPath = (type, entity) ->
  name = normalizeName entity.name
  if type is 'graph'
    return "graphs/#{name}.json"
  componentDir = 'components'
  componentDir = 'spec' if type is 'spec'
  switch entity.language
    when 'coffeescript' then return "#{componentDir}/#{name}." + 'coffee'
    when 'javascript' then return "#{componentDir}/#{name}.js"
    when 'c++' then return "#{componentDir}/#{name}.hpp"
    when 'python' then return "#{componentDir}/#{name}.py"
    else return "#{componentDir}/#{name}.#{entity.language}"

addToPull = (type, local, remote, operations) ->
  operations.pull.push
    path: remote.fullPath
    type: type
    local: local
    remote: remote
addToPush = (type, local, remote, operations) ->
  operations.push.push
    path: remote?.fullPath or createPath type, local
    type: type
    local: local
    remote: remote
addToConflict = (type, local, remote, operations) ->
  operations.conflict.push
    path: remote.fullPath
    type: type
    local: local
    remote: remote

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'reference',
    datatype: 'object'
  c.inPorts.add 'project',
    datatype: 'object'
  c.inPorts.add 'token',
    datatype: 'string',
    required: yes
  c.outPorts.add 'noop',
    datatype: 'object'
  c.outPorts.add 'local',
    datatype: 'object'
  c.outPorts.add 'remote',
    datatype: 'object'
  c.outPorts.add 'both',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: ['reference', 'project']
    params: 'token'
    out: ['noop', 'local', 'remote', 'both']
    async: true
  , (data, groups, out, callback) ->
    operations =
      repo: data.project.repo
      project: data.project
      ref: data.reference.ref
      commit: data.reference.object.sha
      push: []
      pull: []
      conflict: []

    getRemoteObjects operations.repo, operations.commit, c.params.token, (err, objects) ->
      return callback err if err
      operations.tree = objects.tree

      for remoteGraph in objects.graphs
        matching = data.project.graphs.filter (localGraph) ->
          return true if localGraph.properties.sha is remoteGraph.sha
          return true if normalizeName(localGraph.name) is remoteGraph.name
          false
        unless matching.length
          # No local version, add to pull
          addToPull 'graph', null, remoteGraph, operations
          continue
        if matching[0].properties.sha is remoteGraph.sha
          # Updated local version
          addToPush 'graph', matching[0], remoteGraph, operations if matching[0].properties.changed
          continue
        if matching[0].properties.changed is false
          addToPull 'graph', matching[0], remoteGraph, operations
          continue
        addToConflict 'graph', matching[0], remoteGraph, operations

      localOnly = data.project.graphs.filter (localGraph) ->
        notPushed = true
        for remoteGraph in objects.graphs
          notPushed = false if localGraph.properties.sha is remoteGraph.sha
          notPushed = false if normalizeName(localGraph.name) is remoteGraph.name
        return notPushed
      addToPush 'graph', localGraph, null, operations for localGraph in localOnly

      for remoteComponent in objects.components
        matching = data.project.components.filter (localComponent) ->
          return true if localComponent.sha is remoteComponent.sha
          return true if normalizeName(localComponent.name) is remoteComponent.name
          false
        unless matching.length
          # No local version, add to pull
          addToPull 'component', null, remoteComponent, operations
          continue
        if matching[0].sha is remoteComponent.sha
          # Updated local version
          addToPush 'component', matching[0], remoteComponent, operations if matching[0].changed
          continue
        if matching[0].changed is false
          addToPull 'component', matching[0], remoteComponent, operations
          continue
        addToConflict 'component', matching[0], remoteComponent, operations

      localOnly = data.project.components.filter (localComponent) ->
        return false unless localComponent.code.length
        notPushed = true
        for remoteComponent in objects.components
          notPushed = false if localComponent.sha is remoteComponent.sha
          notPushed = false if normalizeName(localComponent.name) is remoteComponent.name
        return notPushed
      addToPush 'component', localComponent, null, operations for localComponent in localOnly

      for remoteSpec in objects.specs
        matching = data.project.specs.filter (localSpec) ->
          return true if localSpec.sha is remoteSpec.sha
          return true if normalizeName(localSpec.name) is remoteSpec.name
          false
        unless matching.length
          # No local version, add to pull
          addToPull 'spec', null, remoteSpec, operations
          continue
        if matching[0].sha is remoteSpec.sha
          # Updated local version
          addToPush 'spec', matching[0], remoteSpec, operations if matching[0].changed
          continue
        if matching[0].changed is false
          addToPull 'spec', matching[0], remoteSpec, operations
          continue
        addToConflict 'spec', matching[0], remoteSpec, operations

      localOnly = data.project.specs.filter (localSpec) ->
        return false unless localSpec.code.length
        notPushed = true
        for remoteSpec in objects.specs
          notPushed = false if localSpec.sha is remoteSpec.sha
          notPushed = false if normalizeName(localSpec.name) is remoteSpec.name
        return notPushed
      addToPush 'spec', localSpec, null, operations for localSpec in localOnly

      if operations.conflict.length
        out.both.send operations
        do callback
        return

      if operations.push.length and operations.pull.length
        out.both.send operations
        do callback
        return

      if operations.push.length
        out.local.send operations
        do callback
        return

      if operations.pull.length
        out.remote.send operations
        do callback
        return

      out.noop.send operations
      do callback

  c
