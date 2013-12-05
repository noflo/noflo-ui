Base = require './base'

class IframeRuntime extends Base
  constructor: (graph) ->
    # Prepare the iframe and listen to its state
    @origin = window.location.origin
    @preview = null
    @previewObserver = null

    super graph

  getType: -> 'iframe'

  setParentElement: (parent) ->
    @iframe = document.createElement 'iframe'
    parent.appendChild @iframe
    @iframe

  connect: (preview) ->
    @iframe.addEventListener 'load', @onLoaded, false

    # Let the UI know we're connecting
    @emit 'status',
      online: false
      label: 'connecting'

    # Normalize the preview setup
    preview = @normalizePreview preview

    # Set the source to the iframe so that it can load
    @iframe.setAttribute 'src', preview.src

    # Set an ID for targeting purposes
    @iframe.id = 'preview-iframe'

    @address = preview.src

    # Update iframe contents as needed
    @preview = preview
    if preview.content
      @on 'connected', @updateIframe
    # Update it also if the preview contents change
    @previewObserver = new ObjectObserver preview, @updateIframe

    # Start listening for messages from the iframe
    window.addEventListener 'message', @onMessage, false

  updateIframe: =>
    body = @iframe.contentDocument.querySelector 'body'
    body.innerHTML = @preview.content

  normalizePreview: (preview) ->
    unless preview
      preview = {}
    unless preview.src
      preview.src = './preview/iframe.html'
    unless preview.width
      preview.width = 300
    unless preview.height
      preview.height = 300
    preview

  disconnect: ->
    @iframe.removeEventListener 'load', @onLoaded, false
    if @previewObserver
      @previewObserver.close()
      @previewObserver = null

    # Stop listening to messages
    window.removeEventListener 'message', @onMessage, false
    @emit 'status',
      online: false
      label: 'disconnected'

  # Called every time the iframe has loaded successfully
  onLoaded: =>
    @emit 'status',
      online: true
      label: 'connected'
    @emit 'connected'

  getElement: -> @iframe

  send: (protocol, command, payload) ->
    w = @iframe.contentWindow
    if not w or w.location.href is 'about:blank'
      return
    w.postMessage
      protocol: protocol
      command: command
      payload: payload
    , w.location.href

  onMessage: (message) =>
    switch message.data.protocol
      when 'graph' then @recvGraph message.data.command, message.data.payload
      when 'network' then @recvNetwork message.data.command, message.data.payload
      when 'component' then @recvComponent message.data.command, message.data.payload

module.exports = IframeRuntime
