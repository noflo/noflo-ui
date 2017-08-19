describe 'Project Creation Dialog', ->
  win = null
  doc = null
  ui = null
  main = null
  button = null
  dialog = null
  before ->
    iframe = document.getElementById 'app'
    win = iframe.contentWindow
    doc = iframe.contentDocument
  it 'should find noflo-ui', ->
    ui = doc.querySelector 'noflo-ui'
    chai.expect(ui).to.exist
  it 'should find noflo-main', ->
    main = doc.querySelector 'noflo-main'
    chai.expect(main).to.exist
  it 'should find the right button', ->
    button = doc.querySelector('noflo-main #newproject')
    chai.expect(button).to.exist
  it 'dialog shouldn\'t be shown before a click', ->
    dialogs = doc.querySelectorAll 'noflo-new-project'
    chai.expect(dialogs.length).to.equal 0
  describe 'Opening and closing the dialog', ->
    it 'clicking the button should show the dialog', (done) ->
      Syn.click button
      setTimeout ->
        dialogs = doc.querySelectorAll 'noflo-new-project'
        chai.expect(dialogs.length).to.equal 1
        dialog = dialogs[0]
        done()
      , 10
    it 'initially the submit button should be disabled', ->
      submit = doc.querySelector 'noflo-new-project .toolbar button'
      chai.expect(submit).to.exist
      chai.expect(submit.classList.contains('disabled')).to.equal true
    it 'clicking the cancel button should close the dialog', (done) ->
      cancel = doc.querySelector 'noflo-new-project .toolbar a'
      Syn.click cancel
      setTimeout ->
        dialogs = doc.querySelectorAll 'noflo-new-project'
        chai.expect(dialogs.length).to.equal 0
        done()
      , 10
  describe 'Creating a project', ->
    it 'clicking the button should show the dialog again', (done) ->
      Syn.click button
      setTimeout ->
        dialogs = doc.querySelectorAll 'noflo-new-project'
        chai.expect(dialogs.length).to.equal 1
        dialog = dialogs[0]
        done()
      , 10
    it 'typing values to the required input fields should enable submission', (done) ->
      @timeout 3000
      inputs = doc.querySelectorAll 'noflo-new-project input'
      chai.expect(inputs.length).to.equal 2
      Syn.click(inputs[0])
      .type('foo')
      Syn.click(inputs[1])
      .type('Foo')
      setTimeout ->
        submit = doc.querySelector 'noflo-new-project .toolbar button'
        chai.expect(submit.classList.contains('disabled')).to.equal false
        done()
      , 2000
    it 'should redirect to the project after clicking submit', (done) ->
      @timeout 3000
      submit = doc.querySelector 'noflo-new-project .toolbar button'
      Syn.click submit
      setTimeout ->
        chai.expect(win.location.hash.indexOf('project/')).to.not.equal -1
        done()
      , 1800
    it 'should have closed the dialog', ->
      dialogs = doc.querySelectorAll 'noflo-new-project'
      chai.expect(dialogs.length).to.equal 0
    it 'should have registered the project to noflo-main', ->
      chai.expect(main.projects.length).to.be.above 0
