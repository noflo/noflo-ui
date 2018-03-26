portForLibrary = (port) ->
  definition =
    name: port.id
    type: port.type
    description: port.type
    addressable: port.addressable
    schema: port.schema
  return definition

# Covert FBP Protocol component to the-graph library component
exports.componentForLibrary = (component) ->
  definition =
    name: component.name
    icon: component.icon or 'cog'
    description: component.description or ''
    subgraph: component.subgraph
    inports: component.inPorts.map portForLibrary
    outports: component.outPorts.map portForLibrary
