describe('Project Creation Dialog', function() {
  let win = null;
  let doc = null;
  let ui = null;
  let main = null;
  let button = null;
  let dialog = null;
  before(function() {
    const iframe = document.getElementById('app');
    win = iframe.contentWindow;
    return doc = iframe.contentDocument;
  });
  it('should find noflo-ui', function() {
    ui = doc.querySelector('noflo-ui');
    return chai.expect(ui).to.exist;
  });
  it('should find noflo-main', function() {
    main = doc.querySelector('noflo-main');
    return chai.expect(main).to.exist;
  });
  it('should find the right button', function() {
    button = doc.querySelector('noflo-main #newproject');
    return chai.expect(button).to.exist;
  });
  it('dialog shouldn\'t be shown before a click', function() {
    const dialogs = doc.querySelectorAll('noflo-new-project');
    return chai.expect(dialogs.length).to.equal(0);
  });
  describe('Opening and closing the dialog', function() {
    it('clicking the button should show the dialog', function(done) {
      syn.click(button);
      return setTimeout(function() {
        const dialogs = doc.querySelectorAll('noflo-new-project');
        chai.expect(dialogs.length).to.equal(1);
        dialog = dialogs[0];
        return done();
      }
      , 10);
    });
    it('initially the submit button should be disabled', function() {
      const submit = doc.querySelector('noflo-new-project .toolbar button');
      chai.expect(submit).to.exist;
      return chai.expect(submit.classList.contains('disabled')).to.equal(true);
    });
    it('clicking the cancel button should close the dialog', function(done) {
      const cancel = doc.querySelector('noflo-new-project .toolbar a');
      syn.click(cancel);
      return setTimeout(function() {
        const dialogs = doc.querySelectorAll('noflo-new-project');
        chai.expect(dialogs.length).to.equal(0);
        return done();
      }
      , 10);
    });
  });
  describe('Creating a project', function() {
    it('clicking the button should show the dialog again', function(done) {
      syn.click(button);
      return setTimeout(function() {
        const dialogs = doc.querySelectorAll('noflo-new-project');
        chai.expect(dialogs.length).to.equal(1);
        dialog = dialogs[0];
        return done();
      }
      , 10);
    });
    it('typing values to the required input fields should enable submission', function(done) {
      this.timeout(3000);
      const inputs = doc.querySelectorAll('noflo-new-project input');
      chai.expect(inputs.length).to.equal(2);
      syn.click(inputs[0])
      .type('foo');
      syn.click(inputs[1])
      .type('Foo');
      return setTimeout(function() {
        const submit = doc.querySelector('noflo-new-project .toolbar button');
        chai.expect(submit.classList.contains('disabled')).to.equal(false);
        return done();
      }
      , 2000);
    });
    it('should redirect to the project after clicking submit', function(done) {
      this.timeout(3000);
      const submit = doc.querySelector('noflo-new-project .toolbar button');
      syn.click(submit);
      return setTimeout(function() {
        chai.expect(win.location.hash.indexOf('project/')).to.not.equal(-1);
        return done();
      }
      , 1800);
    });
    it('should have closed the dialog', function() {
      const dialogs = doc.querySelectorAll('noflo-new-project');
      return chai.expect(dialogs.length).to.equal(0);
    });
    it('should have registered the project to noflo-main', () => chai.expect(main.projects.length).to.be.above(0));
  });
});
