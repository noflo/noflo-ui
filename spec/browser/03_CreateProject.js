describe('Project Creation Dialog', () => {
  let win = null;
  let doc = null;
  let ui = null;
  let main = null;
  let button = null;
  let dialog = null;
  before(() => {
    const iframe = document.getElementById('app');
    win = iframe.contentWindow;
    doc = iframe.contentDocument;
  });
  it('should find noflo-ui', () => {
    ui = doc.querySelector('noflo-ui');
    chai.expect(ui).to.exist;
  });
  it('should find noflo-main', () => {
    main = ui.shadowRoot.querySelector('noflo-main');
    chai.expect(main).to.exist;
  });
  it('should find the right button', () => {
    button = main.shadowRoot.querySelector('#newproject');
    chai.expect(button).to.exist;
  });
  it('dialog shouldn\'t be shown before a click', () => {
    const dialogs = doc.querySelectorAll('noflo-new-project');
    chai.expect(dialogs.length).to.equal(0);
  });
  describe('Opening and closing the dialog', () => {
    it('clicking the button should show the dialog', (done) => {
      syn.click(button);
      setTimeout(() => {
        const dialogs = doc.querySelectorAll('noflo-new-project');
        chai.expect(dialogs.length).to.equal(1);
        dialog = dialogs[0];
        done();
      }, 10);
    });
    it('initially the submit button should be disabled', () => {
      const submit = dialog.shadowRoot.querySelector('.toolbar button');
      chai.expect(submit).to.exist;
      chai.expect(submit.classList.contains('disabled')).to.equal(true);
    });
    it('clicking the cancel button should close the dialog', (done) => {
      const cancel = dialog.shadowRoot.querySelector('.toolbar a');
      syn.click(cancel);
      setTimeout(() => {
        const dialogs = doc.querySelectorAll('noflo-new-project');
        chai.expect(dialogs.length).to.equal(0);
        done();
      }, 10);
    });
  });
  describe('Creating a project', () => {
    it('clicking the button should show the dialog again', (done) => {
      syn.click(button);
      setTimeout(() => {
        const dialogs = doc.querySelectorAll('noflo-new-project');
        chai.expect(dialogs.length).to.equal(1);
        dialog = dialogs[0];
        return done();
      }, 10);
    });
    it('typing values to the required input fields should enable submission', function (done) {
      this.timeout(3000);
      const inputs = dialog.shadowRoot.querySelectorAll('input');
      chai.expect(inputs.length).to.equal(2);
      syn.click(inputs[0])
        .type('foo');
      syn.click(inputs[1])
        .type('Foo');
      setTimeout(() => {
        const submit = dialog.shadowRoot.querySelector('.toolbar button');
        chai.expect(submit.classList.contains('disabled')).to.equal(false);
        done();
      }, 2000);
    });
    it('should redirect to the project after clicking submit', function (done) {
      this.timeout(3000);
      const submit = dialog.shadowRoot.querySelector('.toolbar button');
      syn.click(submit);
      setTimeout(() => {
        chai.expect(win.location.hash.indexOf('project/')).to.not.equal(-1);
        done();
      }, 1800);
    });
    it('should have closed the dialog', () => {
      const dialogs = doc.querySelectorAll('noflo-new-project');
      chai.expect(dialogs.length).to.equal(0);
    });
    it('should have registered the project to noflo-main', () => {
      chai.expect(main.projects.length).to.be.above(0);
    });
  });
});
