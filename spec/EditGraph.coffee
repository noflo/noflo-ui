describe 'Editing a graph', ->
  win = null
  doc = null
  editor = null
  graph = null
  before ->
    iframe = document.getElementById 'app'
    win = iframe.contentWindow
    doc = iframe.contentDocument

  describe 'initially', ->
    it 'should have a graph editor available', ->
      editor = doc.querySelector 'the-graph-editor'
      chai.expect(editor).to.be.an 'object'
      graph = editor.shadowRoot.querySelector 'the-graph'
      chai.expect(graph).to.be.an 'object'
    it 'should have no nodes in the graph editor', ->
      nodes = graph.shadowRoot.querySelectorAll 'g.nodes g.node'
      chai.expect(nodes.length).to.equal 0

  describe.skip 'help screen', ->
    help = null
    it 'should be visible initially', ->
      help = doc.querySelector 'noflo-help'
      chai.expect(help).to.be.an 'object'
      chai.expect(help.visible).to.equal true
    it 'should go away after a click', (done) ->
      Syn.click help
      setTimeout ->
        chai.expect(help.visible).to.equal false
        done()
      , 1

  describe 'runtime', ->
    runtime = null
    it 'should be available as an element', ->
      runtime = doc.querySelector 'noflo-runtime'
    it 'should have the IFRAME runtime selected', ->
      chai.expect(runtime.runtime).to.be.an 'object'
    it 'should connect automatically to the IFRAME provider', (done) ->
      @timeout 30000
      if runtime.online
        chai.expect(runtime.online).to.equal true
        done()
        return

      runtime.runtime.on 'status', (status) ->
        return unless status.online
        chai.expect(runtime.online).to.equal true
        done()

  describe 'component search', ->
    search = null
    it 'should initially show the breadcrumb', ->
      search = doc.querySelector 'noflo-search'
      chai.expect(search).to.be.an 'object'
      chai.expect(search.classList.contains('overlay')).to.equal true
    it 'when clicked it should show the search input', (done) ->
      @timeout 10000
      breadcrumb = search.shadowRoot.querySelector '#breadcrumb'
      chai.expect(breadcrumb).to.be.an 'object'
      setTimeout ->
        Syn.click breadcrumb
        setTimeout ->
          chai.expect(search.classList.contains('overlay')).to.equal false
          done()
        , 500
      , 5000
    it 'should initially show results', (done) ->
      @timeout 30000
      if search.searchResults.length
        chai.expect(search.searchResults.length).to.be.above 10
        done()
        return

      checkResults = ->
        if search.searchResults and search.searchResults.length > 20
          chai.expect(search.searchResults.length).to.be.above 10
          return done()
        setTimeout checkResults, 1000
      setTimeout checkResults, 1000
    it 'should narrow them down when something is written', (done) ->
      @timeout 10000
      input = search.shadowRoot.querySelector '#search'
      Syn.click(input)
      .type 'GetEle'

      checkResults = ->
        if search.searchResults and search.searchResults.length is 1
          chai.expect(search.searchResults.length).to.equal 1
          return done()
        setTimeout checkResults, 1000
      setTimeout checkResults, 1000
    it 'should add a node when result is clicked', (done) ->
      @timeout 3000
      context = doc.querySelector 'noflo-context'
      chai.expect(context).to.be.an 'object'
      results = context.shadowRoot.querySelector 'noflo-search-results'
      chai.expect(results).to.be.an 'object'
      getelement = results.shadowRoot.querySelector 'li'
      chai.expect(getelement).to.be.an 'object'
      Syn.click getelement
      setTimeout ->
        nodes = graph.shadowRoot.querySelectorAll 'g.nodes g.node'
        chai.expect(nodes.length).to.equal 1
        done()
      , 1000
