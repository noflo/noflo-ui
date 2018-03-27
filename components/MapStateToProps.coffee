noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Map application state to UI properties'
  c.inPorts.add 'state',
    datatype: 'object'
    description: 'Full application state'
  c.inPorts.add 'updated',
    datatype: 'object'
    description: 'Updated application state values'
  c.outPorts.add 'props',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'state', 'updated'
    [state, updated] = input.getData 'state', 'updated'
    props = {}
    Object.keys(updated).forEach (key) ->
      switch key
        when 'runtime'
          # FIXME: We can't pass runtime until Polymer side is fixed
          return
        when 'componentLibraries'
          # Filter UI components to current runtime
          if state.runtime?.id
            props.componentLibrary = updated[key][state.runtime.id] or []
          return
        else
          props[key] = updated[key]
    output.sendDone
      props: props
