{Dataflow} = require '/meemoo-dataflow'

class NoFloPreview
  initialize: (dataflow) ->
    @preview = null

    @$connector = $ "<div>
      <h2><i></i> <span>WebSocket</span></h2>
      <div class=\"toolbar\">
        <button class=\"start btn\"><i class=\"icon-play\"></i></button>
        <button class=\"stop btn\"><i class=\"icon-stop\"></i></button>
        <button class=\"connect btn\"><i class=\"icon-refresh\"></i></button>
        <span class=\"status\"></span>
        <span class=\"uptime\"></span>
      </div>
      <div class=\"preview\"></div>
    </div>"

    @$status = @$connector.find '.status'
    @$preview = @$connector.find '.preview'
    @$startButton = @$connector.find '.start'
    @$stopButton = @$connector.find '.stop'
    @$connButton = @$connector.find '.connect'

    dataflow.addPlugin
      id: 'preview'
      name: ''
      menu: @$connector
      icon: 'play-circle'
      pinned: true

    @$startButton.click =>
      @runtime.start()
    @$stopButton.click =>
      @runtime.stop()
    @$startButton.hide()
    @$stopButton.hide()
    @$connButton.hide()

  setRuntime: (@runtime) ->
    #@$preview.append @runtime.getElement()
    switch @runtime.getType()
      when 'iframe'
        @$connector.find('h2 i').addClass 'icon-globe'
      else
        @$connector.find('h2 i').addClass 'icon-cloud'

    @runtime.on 'status', (status) =>
      @$status.removeClass 'online'
      @$status.removeClass 'offline'
      @$status.removeClass 'pending'
      @$status.addClass status.state

      @$status.html status.label

      if status.label is 'running'
        @$startButton.hide()
        @$stopButton.show()
      if status.label is 'stopped'
        @$stopButton.hide()
        @$startButton.show()

  preparePreview: (preview, callback) ->
    @runtime.connect preview
    @$connButton.click =>
      @preparePreview preview, ->

    @runtime.once 'connected', =>
      @$connector.find('h2 span').html @runtime.getAddress()
      @$connButton.hide()
      @$startButton.show()
      callback()
    @runtime.once 'disconnected', =>
      @$connButton.show()
      @$startButton.hide()
      @$stopButton.hide()

plugin = Dataflow::plugin 'preview'
Dataflow::plugins['preview'] = new NoFloPreview
