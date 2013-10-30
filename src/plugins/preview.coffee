class GraphPreview
  constructor: ->
    @contextPanel = document.getElementById 'context'
    @fixedPanel = document.getElementById 'fixed'
    @runtime = null
    @icon = 'cloud'
    @status =
      label: 'offline'
      state: 'offline'
      connected: false
    @running = false
    @stopped = true

  template: """
  <template bind>
    <div class="status">{{ status.label }} <span class="{{ status.state }}"><i class="icon-{{ icon }}"></i></span></div>
    <div class="runcontrol">
      <template bind if="{{ running }}">
        running <button class="stop"><i class="icon-pause"></i></button>
      </template>
      <template bind if="{{ stopped }}">
        stopped <button class="start"><i class="icon-play"></i></button>
      </template>
    </div>
  </template>
  """

  showCard: (container) =>
    return if @contextPanel.querySelector '#runtimePreview'
    return if @fixedPanel.querySelector '#runtimePreview'
    card = document.createElement 'the-card'
    card.setAttribute 'id', 'runtimePreview'
    # Move the preview element of the runtime to the plugin card
    card.appendChild @runtime.getElement()
    container.appendChild card

  registerRuntime: (@runtime) ->
    @controls = document.getElementById 'runtime'
    @controls.innerHTML = @template
    template = @controls.getElementsByTagName('template')[0]
    template.model = @

    setTimeout =>
      @controls.getElementsByClassName('runcontrol')[0].addEventListener 'click', (event) =>
        event.preventDefault()
        clickedButton = event.target
        if clickedButton.nodeName isnt 'BUTTON'
          clickedButton = clickedButton.parentNode
        return if clickedButton.nodeName isnt 'BUTTON'
        do @runtime[clickedButton.className]

      , false
    , 1

    switch @runtime.getType()
      when 'iframe'
        @icon = 'globe'
      else
        @icon = 'cloud'

    @runtime.on 'status', (status) =>
      @status.label = status.label
      @status.state = status.state
      if status.state is 'online'
        @status.connected = true
      else
        @status.connected = false
      if status.label is 'running'
        @running = true
        @stopped = false
      if status.label is 'stopped'
        @running = false
        @stopped = true

    @runtime.once 'connected', =>
      @showCard @contextPanel.getMain()

    @runtime.once 'disconnected', =>
      # TODO: Hide card?
    
  register: (instance) ->
    @graph = instance

  unregister: (instance) ->
    @graph = null

module.exports = GraphPreview
