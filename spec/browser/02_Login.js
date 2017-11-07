describe('Login', function() {
  let win = null;
  let doc = null;
  let ui = null;
  let main = null;
  let mainaccount = null;
  before(function() {
    const iframe = document.getElementById('app');
    win = iframe.contentWindow;
    return doc = iframe.contentDocument;
  });
  it('should find noflo-ui', () => ui = doc.querySelector('noflo-ui'));
  it('should find noflo-main', function() {
    main = doc.querySelector('noflo-main');
    return chai.expect(main).to.exist;
  });
  it('should find noflo-main', function() {
    mainaccount = doc.querySelector('noflo-main #mainaccount');
    return chai.expect(mainaccount).to.exist;
  });
});
