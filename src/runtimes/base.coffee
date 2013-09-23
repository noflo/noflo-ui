class BaseRuntime
  constructor: (@dataflow, @graph) ->
    @components = {}
    @types = {}
    @instances = {}
    @networkListeners = []
    @resetListeners = []
    @connect 'graph'
    @connect 'network'
    @connect 'component'
    @prepareComponents()

  libraryUpdater: _.debounce ->
      @dataflow.plugins.library.update
        exclude: [
          "base"
          "base-resizable"
          "dataflow-subgraph"
        ]
    , 100

  getComponentInstance: (name, attributes) ->
    return null unless @types[name]
    type = @types[name]
    instance = new type.Model attributes
    @instances[name] = [] unless @instances[name]
    @instances[name].push instance
    instance

  loadComponents: (baseDir) ->
    @sendComponent 'list', baseDir

  prepareComponents: ->
    components = {}
    @graph.nodes.forEach (node) =>
      components[node.component] =
        name: node.component
        description: ''
        inPorts: []
        outPorts: []
      @graph.edges.forEach (edge) ->
        if edge.from.node is node.id
          components[node.component].outPorts.push
            id: edge.from.port
            type: 'all'
        if edge.to.node is node.id
          components[node.component].inPorts.push
            id: edge.to.port
            type: 'all'
      @graph.initializers.forEach (iip) ->
        if iip.to.node is node.id
          components[node.component].inPorts.push
            id: iip.to.port
            type: 'all'
    @registerComponent component for name, component of components

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

  listenReset: (callback) ->
    @resetListeners.push callback

  sendResetEvent: ->
    for callback in @resetListeners
      do callback

  listenNetwork: (callback) ->
    @networkListeners.push callback

  sendNetworkEvent: (command, payload) ->
    for callback in @networkListeners
      callback command, payload

  recvComponent: (command, payload) ->
    switch command
      when 'component' then @registerComponent payload

  recvGraph: ->

  recvNetwork: (command, payload) ->
    switch command
      when 'start' then return
      when 'stop' then return
      else
        @sendNetworkEvent command, payload

  connect: (protocol) ->
  sendGraph: (command, payload) ->
  sendNetwork: (command, payload) ->
  sendComponent: (command, payload) ->

module.exports = BaseRuntime
