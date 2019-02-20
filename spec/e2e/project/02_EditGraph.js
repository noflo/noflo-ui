const syn = require('syn');

describe('Editing a graph', () => {
  let doc = null;
  let ui = null;
  let editor = null;
  let graph = null;
  before(() => {
    const iframe = document.getElementById('app');
    doc = iframe.contentDocument;
  });

  describe('initially', () => {
    it('should have a graph editor available', () => {
      ui = doc.querySelector('noflo-ui');
      editor = ui.shadowRoot.querySelector('the-graph-editor');
      chai.expect(editor).to.exist;
      graph = editor.shadowRoot.querySelector('the-graph');
      chai.expect(graph).to.exist;
    });
    it('should have no nodes in the graph editor', () => {
      const nodes = graph.shadowRoot.querySelectorAll('g.nodes g.node');
      chai.expect(nodes.length).to.equal(0);
    });
  });

  describe.skip('help screen', () => {
    let help = null;
    it('should be visible initially', () => {
      help = doc.querySelector('noflo-help');
      chai.expect(help).to.exist;
      chai.expect(help.visible).to.equal(true);
    });
    it('should go away after a click', (done) => {
      syn.click(help);
      setTimeout(() => {
        chai.expect(help.visible).to.equal(false);
        done();
      }, 1);
    });
  });

  describe('runtime', () => {
    let runtime = null;
    it('should be available as an element', () => {
      runtime = ui.shadowRoot.querySelector('noflo-runtime');
    });
    it('should have the IFRAME runtime selected', () => {
      chai.expect(runtime.runtime).to.be.an('object');
    });
    it('should connect automatically to the IFRAME provider', function (done) {
      this.timeout(45000);
      if (runtime.runtime.status.online) {
        chai.expect(runtime.runtime.definition.protocol).to.equal('iframe');
        done();
        return;
      }
      let tries = 0;
      const allowedTries = 400;
      const checkOnline = () => {
        if (tries > allowedTries) {
          chai.expect(runtime.runtime.status.online).to.equal(true);
          chai.expect(runtime.runtime.definition.protocol).to.equal('iframe');
          done();
          return;
        }
        if (runtime.runtime.status.online) {
          chai.expect(runtime.runtime.definition.protocol).to.equal('iframe');
          done();
          return;
        }
        tries += 1;
        setTimeout(checkOnline, 100);
      };
      setTimeout(checkOnline, 100);
    });
  });

  describe('component search', () => {
    let search = null;
    it('should initially show the breadcrumb', () => {
      search = ui.shadowRoot.querySelector('noflo-search');
      chai.expect(search).to.exist;
      chai.expect(search.classList.contains('overlay')).to.equal(true);
    });
    it('when clicked it should show the search input', function (done) {
      this.timeout(10000);
      const breadcrumb = search.shadowRoot.querySelector('#breadcrumb');
      chai.expect(breadcrumb).to.exist;
      setTimeout(() => {
        syn.click(breadcrumb);
        setTimeout(() => {
          chai.expect(search.classList.contains('overlay')).to.equal(false);
          done();
        }, 500);
      }, 5000);
    });
    it('should initially show results', function (done) {
      this.timeout(30000);
      if (search.searchLibraryResults.length) {
        chai.expect(search.searchLibraryResults.length).to.be.above(10);
        done();
        return;
      }

      const checkResults = () => {
        if (search.searchLibraryResults && (search.searchLibraryResults.length > 20)) {
          chai.expect(search.searchLibraryResults.length).to.be.above(10);
          done();
          return;
        }
        setTimeout(checkResults, 1000);
      };
      setTimeout(checkResults, 1000);
    });
    it('should narrow them down when something is written', function (done) {
      this.timeout(10000);
      const input = search.shadowRoot.querySelector('#searchinput');
      syn.click(input)
        .type('GetEle');

      const checkResults = () => {
        if (search.searchLibraryResults && (search.searchLibraryResults.length === 1)) {
          chai.expect(search.searchLibraryResults.length).to.equal(1);
          done();
          return;
        }
        setTimeout(checkResults, 1000);
      };
      setTimeout(checkResults, 1000);
    });
    it('should add a node when result is clicked', function (done) {
      this.timeout(7000);
      const context = ui.shadowRoot.querySelector('noflo-context');
      chai.expect(context).to.exist;
      const results = context.shadowRoot.querySelector('noflo-search-library-results');
      chai.expect(results).to.exist;
      setTimeout(() => {
        const getelement = results.shadowRoot.querySelector('li');
        chai.expect(getelement).to.exist;
        syn.click(getelement);
        setTimeout(() => {
          const nodes = graph.shadowRoot.querySelectorAll('g.nodes g.node');
          chai.expect(nodes.length).to.equal(1);
          done();
        }, 3000);
      }, 10);
    });
  });
});
