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
      setTimeout ->
        done()
      , 1000
  after ->
    db.close()

  it 'should start with the main screen', ->
    chai.expect(win.location.hash).to.equal ''
  it 'should have created the IndexedDB database', (done) ->
    chai.expect(win.indexedDB).to.be.an 'object'
    req = win.indexedDB.open 'noflo-ui', 3
    req.onerror = ->
      chai.expect(true).to.equal false
      done()
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
