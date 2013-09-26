EventEmitter = require 'emitter'

class BaseRuntime extends EventEmitter
  constructor: (@graph) ->
    @address = null

  getType: -> ''
  getAddress: -> @address

  # Connect to the target runtime environment (iframe URL, WebSocket address)
  connect: (target) ->

  disconnect: ->

  # Start a NoFlo Network
  start: ->
    @sendNetwork 'start'

  # Stop a NoFlo network
  stop: ->
    @sendNetwork 'stop'

  # Set the Dataflow parent element
  setParentElement: (parent) ->

  # Get a DOM element rendered by the runtime for preview purposes
  getElement: ->

  recvComponent: (command, payload) ->
    @emit 'component',
      command: command
      payload: payload

  recvGraph: (command, payload) ->
    @emit 'graph',
      command: command
      payload: payload

  recvNetwork: (command, payload) ->
    switch command
      when 'started'
        @emit 'status',
          state: 'online'
          label: 'running'
      when 'stopped'
        @emit 'status',
          state: 'online'
          label: 'stopped'
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
