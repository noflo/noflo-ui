noflo = require 'noflo'
runtimeInfo = require '../runtimeinfo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    data.examples.remote.splice 0, data.examples.remote.length
    for type, definition of runtimeInfo
      runtimes = data.runtimes.local.filter (rt) -> rt.type is type
      continue unless runtimes.length
      examples = Object.keys(definition.examples).filter (example) ->
        exampleId = definition.examples[example].id
        if definition.examples[example].ssl and window.location.protocol isnt 'https:'
          # Skip examples that require SSL when on HTTP
          return false
        for item in data.examples.remote
          # Ensure we don't add dupes
          return false if item.id is exampleId
        for project in data.projects.local
          # Skip examples user has downloaded locally
          return false if project.gist is exampleId
        true
      continue unless examples.length
      for example in examples
        data.examples.remote.push definition.examples[example]
    out.send data
    do callback
