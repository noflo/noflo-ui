noflo = require 'noflo'
octo = require 'octo'
path = require 'path'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'graph',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'object'
  c.outPorts.add 'spec',
    datatype: 'object'
  c.outPorts.add 'project',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    out: ['graph', 'component', 'spec', 'project']
    async: true
  , (data, groups, out, callback) ->
    api = octo.api()
    api.token data.state.user['github-token'] if data.state.user?['github-token']

    project =
      id: "#{data.payload.repo}_#{data.payload.branch}"
      repo: data.payload.repo
      branch: data.payload.branch

    callback new Error "Not implemented yet"
