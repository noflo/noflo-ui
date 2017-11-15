noflo = require 'noflo'
uuid = require 'uuid'

sendPulls = (pulls, repo, scope, output, callback) ->
  unless pulls.length
    do callback
    return
  entry = pulls.shift()
  unless entry.remote
    sendPulls pulls, repo, scope, output, callback
    return
  output.send
    repository: new noflo.IP 'data', repo,
      scope: scope
    sha: new noflo.IP 'data', entry.remote.sha,
      scope: scope
  # Don't fire all requests at once, some of them may get
  # cancelled by server
  setTimeout ->
    sendPulls pulls, repo, scope, output, callback
  , 100

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Prepare a set of blob fetching requests for an operations object'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'repository',
    datatype: 'string'
  c.outPorts.add 'sha',
    datatype: 'string'
  c.process (input, output) ->
    return unless input.hasData 'in'
    data = input.getData 'in'
    return output.done() if data.pull.length is 0
    scope = uuid.v4()
    output.send
      out: new noflo.IP 'data', data,
        scope: scope

    output.send
      sha: new noflo.IP 'openBracket', scope,
        scope: scope
    pulls = data.pull.slice 0
    sendPulls pulls, data.repo, scope, output, ->
      output.send
        sha: new noflo.IP 'closeBracket', scope,
          scope: scope
      output.done()
