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
    chai.expect(ui.shadowRoot).to.exist
  it 'should find noflo-main', ->
    main = ui.shadowRoot.querySelector 'noflo-main'
    chai.expect(main.shadowRoot).to.exist
  it 'should find noflo-main', ->
    mainaccount = main.shadowRoot.querySelector('#mainaccount')
    chai.expect(mainaccount.shadowRoot).to.exist
