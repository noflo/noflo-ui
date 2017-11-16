noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    data = input.getData 'in'
    unless data.state?.user?['grid-token']
      # User not logged in, public repos may work so pass
      output.sendDone
        out: data
      return
    req = new XMLHttpRequest
    req.onreadystatechange = ->
      return unless req.readyState is 4
      unless req.status in [200, 201]
        # Repository not available
        { message } = JSON.parse req.responseText
        if message.indexOf('"message":') isnt -1
          # JSON inside JSON, nice
          { message } = JSON.parse message
        output.done new Error message
        return
      # Repository registered, let sync happen
      output.sendDone
        out: data
      return
    payload = JSON.stringify
      repo: data.payload.repo
      active: true
    req.open 'POST', '$NOFLO_REGISTRY_SERVICE/projects', true
    req.setRequestHeader 'Authorization', "Bearer #{data.state.user['grid-token']}"
    req.setRequestHeader 'Content-Type', 'application/json;charset=UTF-8'
    req.send payload
