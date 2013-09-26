# Dataflow plugin for synchronizing NoFlo's component list with
# the Dataflow library
{Dataflow} = require '/meemoo-dataflow'

class NoFloLibraryPlugin
  constructor: ->
    @dataflow = null

  initialize: (@dataflow) ->
    @runtime = null
    @components = {}
    @types = {}
    @instances = {}

  registerGraph: (graph, runtime) ->
    # Initialize library from graph
    @prepareComponents graph
    @runtime = runtime

    runtime.on 'component', (message) =>
      return unless runtime is @runtime
      @registerComponent message.payload

    # Load components once we have a connection
    runtime.on 'connected', =>
      return unless runtime is @runtime
      runtime.sendComponent 'list', graph.baseDir

  excludeUnavailable: ->
    exclude = []
    for name, component of @dataflow.nodes
      exclude.push name unless @components[name]
    exclude

  # Create dummy components based on the information in the
  # graph before the runtime has given us the real ones.
  prepareComponents: (graph) ->
    components = {}
    graph.nodes.forEach (node) =>
      components[node.component] =
        name: node.component
        description: ''
        inPorts: []
        outPorts: []
      graph.edges.forEach (edge) ->
        if edge.from.node is node.id
          components[node.component].outPorts.push
            id: edge.from.port
            type: 'all'
        if edge.to.node is node.id
          components[node.component].inPorts.push
            id: edge.to.port
            type: 'all'
      graph.initializers.forEach (iip) ->
        if iip.to.node is node.id
          components[node.component].inPorts.push
            id: iip.to.port
            type: 'all'
    @registerComponent component for name, component of components

  # Register a Dataflow node based on the NoFlo component information
  registerComponent: (definition) ->
    @components[definition.name] = definition

    unless @types[definition.name]
      # Register as new component to Dataflow
      BaseType = @dataflow.node 'base'
      @types[definition.name] = @dataflow.node definition.name
      @types[definition.name].Model = BaseType.Model.extend
        defaults: ->
          defaults = BaseType.Model::defaults.call this
          defaults.type = definition.name
          defaults
        inputs: definition.inPorts
        outputs: definition.outPorts
      if definition.description
        @types[definition.name].description = definition.description

      # Update Dataflow library with this component
      do @libraryUpdater

    else
      # Update the definition
      type = @types[definition.name].Model
      type::inputs = definition.inPorts
      type::outputs = definition.outPorts
      # Update instances we already have
      if @instances[definition.name]
        @instances[definition.name].forEach @updateInstancePorts
      # Update the description
      if definition.description
        @types[definition.name].description = definition.description

  updateInstancePorts: (instance) =>
    for port in @components[instance.type].inPorts
      instancePort = instance.inputs.get port.id
      if instancePort
        instancePort.set port
      else
        instance.inputs.add
          label: port.id
          parentNode: instance
          id: port.id
          type: port.type
    for port in @components[instance.type].outPorts
      instancePort = instance.outputs.get port.id
      if instancePort
        instancePort.set port
      else
        instance.outputs.add
          label: port.id
          parentNode: instance
          id: port.id
          type: port.type

  # Create an instance for a component
  getInstance: (name, attributes) ->
    return null unless @types[name]
    type = @types[name]
    instance = new type.Model attributes
    @instances[name] = [] unless @instances[name]
    @instances[name].push instance
    instance

  # Tell Dataflow's library plugin to update its listing based
  # on the components we've registered.
  #
  # This call is made in a debounced fashion to prevent unnecessary
  # redraws.
  libraryUpdater: _.debounce ->
    @dataflow.plugins.library.update
      exclude: @excludeUnavailable()
  , 100

plugin = Dataflow::plugin 'nofloLibrary'
Dataflow::plugins.nofloLibrary = new NoFloLibraryPlugin
