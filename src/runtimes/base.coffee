EventEmitter = require 'emitter'

class BaseRuntime extends EventEmitter
  constructor: (@graph) ->
    @address = null

  getType: -> ''
  getAddress: -> @address

  # Connect to the target runtime environment (iframe URL, WebSocket address)
  connect: (target) ->

  disconnect: ->

  reconnect: ->
    @disconnect()
    @connect @preview

  # Start a NoFlo Network
  start: ->
    @sendNetwork 'start',
      graph: @graph.id

  # Stop a NoFlo network
  stop: ->
    @sendNetwork 'stop',
      graph: @graph.id

  # Set the Dataflow parent element
  setParentElement: (parent) ->

  # Get a DOM element rendered by the runtime for preview purposes
  getElement: ->

  recvComponent: (command, payload) ->
    switch command
      when 'component'
        @emit 'component',
          command: command
          payload: payload
      when 'error'
        @emit 'network',
          command: command
          payload: payload

  recvGraph: (command, payload) ->
    @emit 'graph',
      command: command
      payload: payload

  recvNetwork: (command, payload) ->
    switch command
      when 'started'
        @emit 'execution',
          running: true
          label: 'running'
      when 'stopped'
        @emit 'execution',
          running: false
          label: 'stopped'
      when 'icon'
        @emit 'icon', payload
      else
        @emit 'network',
          command: command
          payload: payload

  sendGraph: (command, payload) ->
    @send 'graph', command, payload
  sendNetwork: (command, payload) ->
    @send 'network', command, payload
  sendComponent: (command, payload) ->
    @send 'component', command, payload

  send: (protocol, command, payload) ->

module.exports = BaseRuntime
