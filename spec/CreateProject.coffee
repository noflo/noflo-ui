describe 'Project Creation Dialog', ->
  win = null
  doc = null
  main = null
  button = null
  dialog = null
  before ->
    iframe = document.getElementById 'app'
    win = iframe.contentWindow
    doc = iframe.contentDocument
  it 'should find noflo-main', ->
    main = doc.querySelector 'noflo-main'
    chai.expect(main).to.be.an 'object'
    chai.expect(main.shadowRoot).to.be.an 'object'
  it 'should find the right button', ->
    button = main.shadowRoot.querySelector('#newproject')
    chai.expect(button).to.be.an 'object'
  it 'dialog shouldn\'t be shown before a click', ->
    dialogs = doc.querySelectorAll 'noflo-new-project'
    chai.expect(dialogs.length).to.equal 0
  it 'clicking the button should show the dialog', (done) ->
    Syn.click button
    setTimeout ->
      dialogs = doc.querySelectorAll 'noflo-new-project'
      chai.expect(dialogs.length).to.equal 1
      dialog = dialogs[0]
      chai.expect(dialog.shadowRoot).to.be.an 'object'
      done()
    , 10
  it 'initially the submit button should be disabled', ->
    submit = dialog.shadowRoot.querySelector '.toolbar button'
    chai.expect(submit).to.be.an 'object'
    chai.expect(submit.classList.contains('disabled')).to.equal true
  it 'clicking the cancel button should close the dialog', (done) ->
    cancel = dialog.shadowRoot.querySelector '.toolbar a'
    Syn.click cancel
    setTimeout ->
      dialogs = doc.querySelectorAll 'noflo-new-project'
      chai.expect(dialogs.length).to.equal 0
      done()
    , 10
