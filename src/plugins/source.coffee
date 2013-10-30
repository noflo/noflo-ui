class GraphSource
  getMenuButtons: ->
    [
      id: 'view-source'
      label: 'view source'
      icon: 'code'
      action: @showCard
    ]

  constructor: ->
    @graph = null

  showCard: (container) =>
    return if container.querySelector '#show-card'
    card = document.createElement 'the-card'
    card.setAttribute 'id', 'view-source'
    card.innerHTML = """
    <h1>Graph source</h1>
    <textarea></textarea>
    """
    card.getElementsByTagName('textarea')[0].value = JSON.stringify @graph.toJSON(), null, 4
    container.appendChild card

  register: (instance) ->
    @graph = instance

  unregister: (instance) ->
    @graph = null

module.exports = GraphSource
