Base = require './base'

class WebSocketRuntime extends Base
  constructor: (graph) ->
    @connecting = false
    @connection = null
    @protocol = 'noflo'
    @buffer = []
    super graph

  getType: -> 'websocket'

  connect: (preview) ->
    return if @connection or @connecting
    @address = @getUrl()
    @connection = new WebSocket @address, @protocol
    @connection.addEventListener 'open', =>
      @connecting = false
      @emit 'status',
        state: 'online'
        label: 'connected'
      @emit 'connected'
      @flush()
    , false
    @connection.addEventListener 'message', @handleMessage, false
    @connection.addEventListener 'error', @handleError, false
    @connection.addEventListener 'close', =>
      @connection = null
      @emit 'status',
        state: 'offline'
        label: 'disconnected'
      @emit 'disconnected'
    , false
    @connecting = true

  disconnect: (protocol) ->
    return unless @connection
    @connection.close()

  send: (protocol, command, payload) ->
    if @connecting
      @buffer.push
        protocol: protocol
        command: command
        payload: payload
      return

    return unless @connection
    @connection.send JSON.stringify
      protocol: protocol
      command: command
      payload: payload

  getUrl: ->
    return "ws://#{location.hostname}:3569"
    "ws://#{location.hostname}:#{location.port}"

  handleError: (error) =>
    @connection = null
    @connecting = false

  handleMessage: (message) =>
    msg = JSON.parse message.data
    switch msg.protocol
      when 'graph' then @recvGraph msg.command, msg.payload
      when 'network' then @recvNetwork msg.command, msg.payload
      when 'component' then @recvComponent msg.command, msg.payload

  flush: ->
    for item in @buffer
      @send item.protocol, item.command, item.payload
    @buffer = []

module.exports = WebSocketRuntime
