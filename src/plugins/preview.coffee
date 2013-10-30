class GraphPreview
  constructor: ->
    @contextPanel = document.getElementById 'context'
    @fixedPanel = document.getElementById 'fixed'
    @runtime = null

  getMenuButtons: ->
    [
      id: 'preview'
      label: 'show preview'
      icon: 'eye-open'
      action: @showCard
    ]

  showCard: (container) =>
    return if @contextPanel.querySelector '#runtimePreview'
    return if @fixedPanel.querySelector '#runtimePreview'
    card = document.createElement 'the-card'
    card.setAttribute 'id', 'runtimePreview'
    # Move the preview element of the runtime to the plugin card
    card.appendChild @runtime.getElement()
    container.appendChild card

  registerRuntime: (@runtime) ->

  register: (instance) ->
    @graph = instance

  unregister: (instance) ->
    @graph = null

  ###
  setPreview: (preview, runtime) ->
    @setRuntime runtime
    @preparePreview preview, runtime

  setRuntime: (runtime) ->
    @runtime = runtime
    switch runtime.getType()
      when 'iframe'
        @$connector.find('h2 i').addClass 'icon-globe'
      else
        @$connector.find('h2 i').addClass 'icon-cloud'

    runtime.on 'status', (status) =>
      return unless runtime is @runtime
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

  preparePreview: (preview, runtime) ->
    runtime.connect preview
    @$connButton.click =>
      return unless runtime is @runtime
      @preparePreview preview, runtime

    runtime.once 'connected', =>
      return unless runtime is @runtime
      # Update preview card contents
      @$connector.find('h2 span').html @runtime.getAddress()
      @$connButton.hide()
      @$startButton.show()

      # Show the preview card automatically
      @dataflow.showPlugin 'preview'

    runtime.once 'disconnected', =>
      return unless runtime is @runtime
      @dataflow.plugins.notification.notify 'noflo.png', 'Error', 'Connection to NoFlo runtime was lost'
      @$connButton.show()
      @$startButton.hide()
      @$stopButton.hide()
  ###

module.exports = GraphPreview
