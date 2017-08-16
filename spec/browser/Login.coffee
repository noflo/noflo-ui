describe 'Login', ->
  win = null
  doc = null
  ui = null
  main = null
  mainaccount = null
  before ->
    iframe = document.getElementById 'app'
    win = iframe.contentWindow
    doc = iframe.contentDocument
  it 'should find noflo-ui', ->
    ui = doc.querySelector 'noflo-ui'
  it 'should find noflo-main', ->
    main = doc.querySelector 'noflo-main'
    chai.expect(main).to.exist
  it 'should find noflo-main', ->
    mainaccount = doc.querySelector('noflo-main #mainaccount')
    chai.expect(mainaccount).to.exist
