describe 'NoFlo UI initialization', ->
  win = null
  doc = null
  db = null
  before (done) ->
    @timeout 20000
    iframe = document.getElementById 'app'
    iframe.src = '../app.html'
    iframe.onload = ->
      win = iframe.contentWindow
      doc = iframe.contentDocument
      doc.addEventListener 'polymer-ready', ->
        setTimeout ->
          done()
        , 5000

  after ->
    db.close()

  it 'should start with the main screen', ->
    chai.expect(win.location.hash).to.equal ''

  describe 'NoFlo PrepareStorage', ->
    it 'should have created the IndexedDB database', (done) ->
      chai.expect(win.indexedDB).to.be.an 'object'
      req = win.indexedDB.open 'noflo-ui', 3
      req.onerror = ->
        chai.expect(true).to.equal false
        done()
      req.onupgradeneeded = (e) =>
        throw new Error 'We didn\'t get a ready database'
      req.onsuccess = (event) ->
        db = event.target.result
        chai.expect(db).to.be.an 'object'
        done()
    it 'should have created the project store', ->
      chai.expect(db.objectStoreNames.contains('projects')).to.equal true
    it 'should have created the graph store', ->
      chai.expect(db.objectStoreNames.contains('graphs')).to.equal true
    it 'should have created the component store', ->
      chai.expect(db.objectStoreNames.contains('components')).to.equal true
    it 'should have created the runtime store', ->
      chai.expect(db.objectStoreNames.contains('runtimes')).to.equal true

  describe 'help screen', ->
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
