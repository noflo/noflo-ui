noflo = require 'noflo'
octo = require 'octo'
path = require 'path'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'project',
    datatype: 'object'
  c.outPorts.add 'token',
    datatype: 'string'
  c.outPorts.add 'pull',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    out: ['project', 'token', 'pull']
    async: true
  , (data, groups, out, callback) ->
    if data.state.user?['github-token']
      token = data.state.user['github-token']
    else
      token = ''

    project =
      id: "#{data.payload.repo}_#{data.payload.branch}"
      name: data.payload.repo
      repo: data.payload.repo
      branch: data.payload.branch
    unless project.branch is 'master'
      project.name += " #{project.branch}"

    out.project.send project
    out.token.send token
    out.pull.send
      project: project
      repo: project.repo
      branch: project.branch
    do callback
