noflo = require 'noflo'
fbpSpec = require 'fbp-spec'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
    description: 'Project'
  c.inPorts.add 'runtime',
    datatype: 'object'
    required: yes
  c.outPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: ['runtime']
    out: 'context'
    async: true
  , (project, groups, out, callback) ->
    unless project
      do callback
      return
    unless c.params.runtime.isConnected()
      do callback
      return
    unless project.specs?.length
      do callback
      return
    specs = project.specs.filter (s) -> s.language is 'yaml'
    unless specs.length
      do callback
      return

    suites = []
    for s in specs
      continue unless s.code.length
      try
        suite = fbpSpec.testsuite.loadYAML s.code
      catch e
        console.log e
        continue
      suites = suites.concat suite
    unless suites.length
      do callback
      return

    # Send out the initial suites
    out.send
      suites: suites

    runner = new fbpSpec.runner.Runner c.params.runtime
    fbpSpec.runner.runAll runner, suites, ->
      # Send updated suite state
      out.send
        suites: suites
    , (err) ->
      return callback err if err
      do callback
