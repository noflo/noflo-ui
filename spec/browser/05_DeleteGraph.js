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
    return doc = iframe.contentDocument;
  });

  describe('initially', () =>
    it('should have a graph editor available', function() {
      ui = doc.querySelector('noflo-ui');
      editor = doc.querySelector('the-graph-editor');
      chai.expect(editor).to.exist;
      graph = doc.querySelector('the-graph-editor the-graph');
      return chai.expect(graph).to.exist;
    })
  );

  describe('graph settings', () =>
    it('should show the graph settings modal when clicked', function(done) {
      this.timeout(7000);
      const search = doc.querySelector('noflo-search');
      chai.expect(search).to.exist;
      const settingsButton = doc.querySelector('noflo-search #graphinspector');
      chai.expect(settingsButton).to.exist;
      return setTimeout(function() {
        syn.click(settingsButton);
        return setTimeout(function() {
          modal = doc.querySelector('noflo-graph-inspector');
          chai.expect(modal).to.exist;
          return done();
        }
        , 500);
      }
      , 2000);
    })
  );

  describe('graph delete', () =>
    it('should remove the graph and project and redirect home', function(done) {
      this.timeout(7000);
      const deleteButton = doc.querySelector('noflo-graph-inspector .delete');
      chai.expect(deleteButton).to.exist;
      return setTimeout(function() {
        syn.click(deleteButton);
        return setTimeout(function() {
          let { hash } = win.location;
          // workaround for ie
          if (hash === '#') {
            hash = '';
          }
          chai.expect(hash).to.equal('');
          return done();
        }
        , 1500);
      }
      , 1500);
    })
  );
});
