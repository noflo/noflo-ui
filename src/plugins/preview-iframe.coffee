{Dataflow} = require '/meemoo-dataflow'

class PreviewIframe
  initialize: (dataflow) ->
    @$iframe = $('<iframe id="preview-iframe"></iframe>')
    $('body').append(@$iframe)
    
    dataflow.addPlugin
      id: 'preview'
      name: ''
      menu: @$iframe
      icon: 'play'

  getElement: ->
    @$iframe[0]

  setContents: (preview, callback) ->
    @$iframe.attr('src', preview.src)
    @$iframe.css
      width: preview.width
      height: preview.height
    loaded = _.once callback
    @$iframe.load loaded

plugin = Dataflow::plugin 'preview-iframe'
Dataflow::plugins['preview-iframe'] = new PreviewIframe
