noflo = require 'noflo'

buildContext = ->
  ctx =
    state: ''
    project: null
    runtime: null
    component: null
    graphs: []
    remote: []

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'projects',
    required: true
    datatype: 'array'
  c.inPorts.add 'runtimes',
    required: true
    datatype: 'array'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: ['projects', 'runtimes']
    out: 'out'
  , (route, groups, out) ->
    ctx = buildContext()
    ctx.state = 'ok'
    ctx.projects = c.params.projects
    ctx.runtimes = c.params.runtimes
    out.send ctx

  c
