describe 'NoFlo UI initialization', ->
  win = null
  doc = null
  db = null
  before (done) ->
    @timeout 20000

    unless localStorage.getItem 'grid-token'
      # Fake login
      localStorage.setItem 'grid-token', '93c76ec0-d14b-11e3-9c1a-0800200c9a66'
      localStorage.setItem 'grid-user', JSON.stringify
        uuid: '11eecff0-d14c-11e3-9c1a-0800200c9a66'
        email: 'user@domain.com'
        name: 'Test User'
        avatar: 'https://secure.gravatar.com/avatar/995f27ce7205a79c55d4e44223cd6de0'

    iframe = document.getElementById 'app'
    iframe.src = '../app.html'
    iframe.onload = ->
      win = iframe.contentWindow
      doc = iframe.contentDocument
      setTimeout ->
        done()
      , 9000

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
