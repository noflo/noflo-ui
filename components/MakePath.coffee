noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in', (event, payload) ->
    return unless event is 'data'
    
    path = "graphs/#{payload.id}.json"
    console.log payload
    
    if payload.code and payload.language
      switch payload.language
        when 'coffeescript'
          path = "components/#{payload.name}.coffee"
        when 'javascript'
          path = "components/#{payload.name}.js"
    console.log path
    c.outPorts.out.send path
    c.outPorts.out.disconnect()
  c.outPorts.add 'out'
            
  c
