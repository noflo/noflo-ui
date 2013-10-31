class GraphPreview
  constructor: ->
    @contextPanel = document.getElementById 'context'
    @fixedPanel = document.getElementById 'fixed'
    @runtime = null
    @icon = 'cloud'
    @status =
      label: 'offline'
      state: 'offline'
      online: false
    @execution =
      label: 'stopped'
      running: false
      stopped: true

  template: """
  <template bind>
    <div class="status {{ status.state }}">{{ status.label }} <span class="state"><i class="icon-{{ icon }}"></i></span></div>
    <div class="runcontrol">
      <template bind if="{{ status.online }}">
        <template bind if="{{ execution.running }}">
          {{ execution.label }} <button class="stop"><i class="icon-pause"></i></button>
        </template>
        <template bind if="{{ execution.stopped }}">
          {{ execution.label }} <button class="start"><i class="icon-play"></i></button>
        </template>
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
        if clickedButton.className is 'start'
          if @contextPanel.querySelector '#runtimePreview'
            do @runtime.start
            return
          @showCard @contextPanel.getMain()
          @runtime.once 'connected', =>
            do @runtime.start
          return
        do @runtime.stop

      , false
    , 1

    switch @runtime.getType()
      when 'iframe'
        @icon = 'globe'
      else
        @icon = 'cloud'

    # Connection status
    @runtime.on 'status', (status) =>
      @status.online = status.online
      if status.online
        @status.state = 'online'
      else
        @status.state = 'offline'
      @status.label = status.label
    # Running status
    @runtime.on 'execution', (status) =>
      if status.running
        @execution.running = true
        @execution.stopped = false
      else
        @execution.running = false
        @execution.stopped = true
      @execution.label = status.label

    @runtime.once 'connected', =>

    @runtime.once 'disconnected', =>
      # TODO: Hide card?
    
  register: (instance) ->
    @graph = instance

  unregister: (instance) ->
    @graph = null

module.exports = GraphPreview
