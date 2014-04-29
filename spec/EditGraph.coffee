describe 'Graph Editor', ->
  win = null
  doc = null
  before ->
    iframe = document.getElementById 'app'
    win = iframe.contentWindow
    doc = iframe.contentDocument

  describe 'component search', ->
    search = null
    it 'should initially show the breadcrumb', ->
      search = doc.querySelector 'noflo-search'
      chai.expect(search).to.be.an 'object'
      chai.expect(search.classList.contains('overlay')).to.equal true
    it 'when clicked it should show the search input', (done) ->
      breadcrumb = search.shadowRoot.querySelector '#breadcrumb'
      chai.expect(breadcrumb).to.be.an 'object'
      Syn.click breadcrumb
      setTimeout ->
        chai.expect(search.classList.contains('overlay')).to.equal false
        done()
      , 500
    it 'should initially show results', (done) ->
      setTimeout ->
        chai.expect(search.results.length).to.be.above 10
        done()
      , 1800
    it 'should narrow them down when something is written', (done) ->
      input = search.shadowRoot.querySelector '#search'
      Syn.click(input)
      .type 'GetEle'
      setTimeout ->
        chai.expect(search.results.length).to.equal 1
        done()
      , 1000
