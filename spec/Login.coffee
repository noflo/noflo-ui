describe 'Login', ->
  win = null
  doc = null
  main = null
  mainaccount = null
  before ->
    iframe = document.getElementById 'app'
    win = iframe.contentWindow
    doc = iframe.contentDocument
  it 'should find noflo-main', ->
    main = doc.querySelector 'noflo-main'
    chai.expect(main).to.be.an 'object'
    chai.expect(main.shadowRoot).to.be.an 'object'
  it 'should find noflo-main', ->
    mainaccount = main.shadowRoot.querySelector('#mainaccount')
    chai.expect(mainaccount).to.be.an 'object'
    chai.expect(mainaccount.shadowRoot).to.be.an 'object'
  it 'should have gate URL with trailing slash', ->
    chai.expect(mainaccount.gatekeeper).to.be.a 'string'
    chai.expect(mainaccount.gatekeeper.slice(-1)).to.equal '/'