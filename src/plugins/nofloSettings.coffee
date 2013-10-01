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
      icon: 'cog'
      pinned: false

    @dataflow = dataflow

  registerGraph: (graph, runtime) ->
    @$settings.html()
    return unless graph.properties.environment.runtime
    switch graph.properties.environment.runtime
      when 'websocket'
        formCb = @renderServerForm graph
      else
        formCb = @renderClientForm graph
    exportsCb = @renderExportsForm graph
    @renderSave graph, ->
      exportsCb()
      formCb()
      graph.emit 'changed'

  renderServerForm: (graph) ->
    $form = $ "<form>
      <label>
        WebSocket URL
        <input class='wsUrl' type='url'>
      </label>
     </form>"
    $wsUrl = $form.find '.wsUrl'
    $wsUrl.val graph.properties.environment.wsUrl
    @$settings.append $form
    return ->
      graph.properties.environment.wsUrl = $wsUrl.val()

  renderClientForm: (graph) ->
    $form = $ "<form>
      <label>
        Preview iframe
        <input class='src' type='text'>
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
     </form>"
    $src = $form.find '.src'
    $content = $form.find '.content'
    $width = $form.find '.width'
    $height = $form.find '.height'

    $src.val graph.properties.environment.src
    $content.val graph.properties.environment.content
    $width.val graph.properties.environment.width
    $height.val graph.properties.environment.height

    @$settings.append $form

    return ->
      graph.properties.environment.src = $src.val()
      graph.properties.environment.content = $content.val()
      graph.properties.environment.height = $height.val()
      graph.properties.environment.width = $width.val()

  renderExportsForm: (graph) ->
    $exports = $ "<div><h2>Exported ports</h2>
      <form class='exports'></form></div>"
    $form = $exports.find '.exports'
    exportTemplate = "
    <label>Public
      <input type='text' name='public' value='<%- public %>'>
    </label>
    <label>Private
      <input type='text' name='private' value='<%- private %>'>
    </label>
    "

    # Render existing
    for exported in graph.exports
      $el = $ '<div class="export"></div>'
      $el.html _.template exportTemplate, exported
      $form.append $el

    # Always one empty
    $el = $ '<div class="export"></div>'
    $el.html _.template exportTemplate,
      public: ''
      private: ''
    $form.append $el

    @$settings.append $exports

    return ->
      graph.exports = []
      $form.find('div.export').each ->
        pub = $(@).find('input[name="public"]').val()
        priv = $(@).find('input[name="private"]').val()
        if pub and priv
          graph.exports.push
            public: pub
            private: priv

  renderSave: (graph, callback) ->
    $save = $ "
      <div class='toolbar'>
        <button class='update'>Update</button>
      </div>
      "
    @$settings.append $save
    $update = $save.find '.update'
    $update.click (event) ->
      event.preventDefault()
      callback()

plugin = Dataflow::plugin 'nofloSettings'
Dataflow::plugins.nofloSettings = new NoFloSettingsPlugin
