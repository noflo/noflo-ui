{Dataflow} = require '/meemoo-dataflow'

class PreviewIframe
  initialize: (dataflow) ->
    @$iframe = $('<iframe id="preview-iframe"></iframe>')
    $(dataflow.el).append(@$iframe)
    
    dataflow.addPlugin
      id: 'preview'
      name: ''
      menu: @$iframe
      icon: 'play'
      pinned: true

  getElement: ->
    @$iframe[0]

  preparePreview: (preview, callback) ->
    preview = @normalizePreview preview
    @$iframe.attr('src', preview.src)
    @$iframe.css
      width: preview.width
      height: preview.height
    loaded = _.once callback
    @$iframe.load loaded

  setContents: (preview) ->
    return unless preview.content
    body = @$iframe[0].contentDocument.querySelector 'body'
    body.innerHTML = preview.content

  normalizePreview: (preview) ->
    unless preview
      preview = {}
    unless preview.src
      preview.src = './preview/iframe.html'
    unless preview.width
      preview.width = 300
    unless preview.height
      preview.height = 300
    preview

plugin = Dataflow::plugin 'preview-iframe'
Dataflow::plugins['preview-iframe'] = new PreviewIframe
