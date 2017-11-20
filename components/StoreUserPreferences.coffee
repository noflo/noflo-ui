noflo = require 'noflo'

validPreferences = [
  'flowhub-theme'
]

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in', 'user'
    [prefs, user] = input.getData 'in', 'user'
    for key, val of prefs
      if validPreferences.indexOf(key) is -1
        output.done new Error "#{key} is not a valid preference"
        return
      localStorage.setItem key, val
      user[key] = val
    output.sendDone
      out: user
