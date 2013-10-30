class GraphMenu
  template: """
  <ul class="toolbar">
    <template repeat="{{ buttons }}">
      <li><button id="{{ id }}"><i class="icon-{{ icon }}" title="{{ label }}"></i></button></li>
    </template>
  </ul>
  """

  constructor: ->
    @buttons = []
    @mainmenu = null
    @panel = null
    @button = null

  showCard: (container) ->
    return if container.querySelector '#menu'
    card = document.createElement 'the-card'
    card.setAttribute 'id', 'menu'
    card.innerHTML = @template
    template = card.getElementsByTagName('template')[0]
    template.model = @

    card.addEventListener 'click', (event) =>
      event.preventDefault()
      clickedButton = event.target
      if event.target.nodeName is 'I'
        clickedButton = clickedButton.parentNode
      buttonId = clickedButton.getAttribute 'id'
      for button in @buttons
        continue unless button.id is buttonId
        button.action container
    , false

    container.appendChild card

  showMenu: (event) =>
    event.preventDefault()
    @showCard @panel.getMain()

  register: (instance) ->
    for name, plugin of instance.plugins
      @addPlugin plugin
    # TODO: ObjectObserver for plugins added later
    
    # Attach to panel button
    @mainmenu = document.getElementById 'mainmenu'
    @panel = document.getElementById 'context'
    @button = document.createElement 'button'
    @button.innerHTML = '<i class="icon-reorder"></i>'
    @mainmenu.appendChild @button
    @button.addEventListener 'click', @showMenu, false

  unregister: (instance) ->
    @buttons = []
    if @button
      @button.removeEventListener 'click', @showMenu, false
      @button.parentNode.removeChild @button
      @button = null

  addPlugin: (plugin) ->
    return unless plugin.getMenuButtons
    buttons = plugin.getMenuButtons()
    for button in buttons
      @buttons.push button

module.exports = GraphMenu
