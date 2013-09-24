{Dataflow} = require '/meemoo-dataflow'

class PreviewWebSocket
  initialize: (dataflow) ->
    @$connector = $ "<div>
      <button class=\"start btn btn-primary\"><i class=\"icon-play\"></i></button>
    </div>"

    dataflow.addPlugin
      id: 'preview'
      name: ''
      menu: @$connector
      icon: 'cloud'
      pinned: true

    @$connector.find('.start').click =>
      return unless dataflow.currentGraph.nofloGraph.runtime
      dataflow.currentGraph.nofloGraph.runtime.sendResetEvent()

  preparePreview: (preview, callback) ->
    do callback

  setContents: (preview) ->
    return

plugin = Dataflow::plugin 'preview-websocket'
Dataflow::plugins['preview-websocket'] = new PreviewWebSocket
