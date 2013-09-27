# Dataflow plugin for managing NoFlo graph properties
{Dataflow} = require '/meemoo-dataflow'

class NoFloSettingsPlugin
  constructor: ->
    @dataflow = null

  initialize: (dataflow) ->
    @runtime = null
    @$settings = $ "<div class=\"noflo-ui-settings\"></div>"

    dataflow.disablePlugin 'log'

    dataflow.addPlugin
      id: 'settings'
      name: ''
      menu: @$settings
      icon: 'th-list'
      pinned: false

  registerGraph: (graph, runtime) ->
    @$settings.html()
    return unless graph.properties.environment.runtime
    switch graph.properties.environment.runtime
      when 'websocket'
        @renderServerForm graph
      else
        @renderClientForm graph

  renderServerForm: (graph) ->

  renderClientForm: (graph) ->
    $form = $ "<form>
      <label>
        Preview iframe
        <input class='src' type='url'>
      </label>
      <label>
        HTML contents
        <textarea class='content'></textarea>
      </label>
      <label>
        Preview width
        <input class='width' type='number'>
      </label>
      <label>
        Preview height
        <input class='height' type='number'>
      </label>
      <button class='update'>Update</button>
     </form>"

    $src = $form.find '.src'
    $content = $form.find '.content'
    $width = $form.find '.width'
    $height = $form.find '.height'
    $update = $form.find '.update'

    $src.val graph.properties.environment.src
    $content.val graph.properties.environment.content
    $width.val graph.properties.environment.width
    $height.val graph.properties.environment.height

    $update.click ->
      graph.properties.environment.src = $src.val()
      graph.properties.environment.content = $content.val()
      graph.properties.environment.height = $height.val()
      graph.properties.environment.width = $width.val()

    @$settings.append $form

plugin = Dataflow::plugin 'nofloSettings'
Dataflow::plugins.nofloSettings = new NoFloSettingsPlugin
