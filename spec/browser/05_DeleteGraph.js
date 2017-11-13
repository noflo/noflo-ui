describe('Deleting a graph', function() {
  let win = null;
  let doc = null;
  let ui = null;
  let editor = null;
  let graph = null;
  let modal = null;

  before(function() {
    const iframe = document.getElementById('app');
    win = iframe.contentWindow;
    doc = iframe.contentDocument;
  });

  describe('initially', () =>
    it('should have a graph editor available', function() {
      ui = doc.querySelector('noflo-ui');
      editor = ui.shadowRoot.querySelector('the-graph-editor');
      chai.expect(editor).to.exist;
      graph = editor.shadowRoot.querySelector('the-graph');
      chai.expect(graph).to.exist;
    })
  );

  describe('graph settings', () =>
    it('should show the graph settings modal when clicked', function(done) {
      this.timeout(7000);
      const search = ui.shadowRoot.querySelector('noflo-search');
      chai.expect(search).to.exist;
      const settingsButton = search.shadowRoot.querySelector('#graphinspector');
      chai.expect(settingsButton).to.exist;
      setTimeout(function() {
        syn.click(settingsButton);
        setTimeout(function() {
          modal = doc.querySelector('noflo-graph-inspector');
          chai.expect(modal).to.exist;
          done();
        }, 500);
      }, 2000);
    })
  );

  describe('graph delete', () =>
    it('should remove the graph and project and redirect home', function(done) {
      this.timeout(7000);
      const deleteButton = modal.shadowRoot.querySelector('.delete');
      chai.expect(deleteButton).to.exist;
      setTimeout(function() {
        syn.click(deleteButton);
        setTimeout(function() {
          let { hash } = win.location;
          // workaround for ie
          if (hash === '#') {
            hash = '';
          }
          chai.expect(hash).to.equal('');
          done();
        }, 1500);
      }, 1500);
    })
  );
});
