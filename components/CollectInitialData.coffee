noflo = require 'noflo'

getData = (input, port) ->
  return input.getStream(port).filter((ip) ->
    # Drop brackets at this stage
    return false unless ip.type is 'data'
    # Drop 'empty' result
    return false if not ip.data or ip.data is true
    true
  ).map (ip) ->
    ip.data

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'project',
    datatype: 'object'
  c.inPorts.add 'graph',
    datatype: 'object'
  c.inPorts.add 'component',
    datatype: 'object'
  c.inPorts.add 'spec',
    datatype: 'object'
  c.inPorts.add 'runtime',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasStream 'project', 'graph', 'component', 'spec', 'runtime'
    result =
      projects: getData input, 'project'
      graphs: getData input, 'graph'
      components: getData input, 'component'
      specs: getData input, 'spec'
      runtimes: getData input, 'runtime'
    output.sendDone
      out: result

