{Dataflow} = require '/meemoo-dataflow'

class PreviewWebSocket
  initialize: (dataflow) ->
    dataflow.addPlugin
      id: 'preview'
      name: ''
      menu: '<div></div>'
      icon: 'play'
      pinned: true

  preparePreview: (preview, callback) ->
    console.log preview
    do callback

  setContents: (preview) ->
    return

plugin = Dataflow::plugin 'preview-websocket'
Dataflow::plugins['preview-websocket'] = new PreviewWebSocket
