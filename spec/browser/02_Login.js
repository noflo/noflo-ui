describe('Login', () => {
  let doc = null;
  let ui = null;
  let main = null;
  let mainaccount = null;
  before(() => {
    const iframe = document.getElementById('app');
    doc = iframe.contentDocument;
  });
  it('should find noflo-ui', () => {
    ui = doc.querySelector('noflo-ui');
  });
  it('should find noflo-main', () => {
    main = ui.shadowRoot.querySelector('noflo-main');
    chai.expect(main).to.exist;
  });
  it('should find noflo-main', () => {
    mainaccount = main.shadowRoot.querySelector('#mainaccount');
    chai.expect(mainaccount).to.exist;
  });
});
