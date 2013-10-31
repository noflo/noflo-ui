class GraphLibrary
  constructor: ->
    @panel = document.getElementById 'context'
    @components = []

  getMenuButtons: ->
    [
      id: 'library'
      label: 'library'
      icon: 'plus'
      action: @showCard
    ]

  template: """
  <template bind>
    <h1>Library</h1>
    <ul class="components">
    <template repeat="{{ components }}">
      <li>
        <span class="icon"><i class="icon-{{ icon }}"></i></span>
        <h2>{{ name }}</h2>
        <span class="description">{{ description }}</span>
      </li>
    </template>
    </ul>
  </template>
  """

  showCard: (container) =>
    return if @panel.querySelector '#libraryCard'
    card = document.createElement 'the-card'
    card.setAttribute 'id', 'libraryCard'
    card.innerHTML = @template
    template = card.getElementsByTagName('template')[0]

    @components = []
    for name, definition of @graph.library
      @components.push definition

    template.model = @
    container.appendChild card

  register: (instance) ->
    @graph = instance

  unregister: (instance) ->
    @graph = null

module.exports = GraphLibrary
