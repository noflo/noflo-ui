describe('NoFlo UI initialization', () => {
  let win = null;
  let db = null;
  before(function (done) {
    this.timeout(75000);

    if (!localStorage.getItem('flowhub-token')) {
      // Fake login
      localStorage.setItem('flowhub-token', '93c76ec0-d14b-11e3-9c1a-0800200c9a66');
      localStorage.setItem('flowhub-user', JSON.stringify({
        uuid: '11eecff0-d14c-11e3-9c1a-0800200c9a66',
        email: 'user@domain.com',
        name: 'Test User',
        avatar: 'https://secure.gravatar.com/avatar/995f27ce7205a79c55d4e44223cd6de0',
      }));
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'app';
    document.body.appendChild(iframe);
    iframe.src = '/base/browser/index.html';
    iframe.style.width = '800px';
    iframe.style.height = '600px';
    iframe.style.position = 'fixed';
    iframe.style.top = '100px';
    iframe.onload = () => {
      win = iframe.contentWindow;
      return setTimeout(() => done(),
        5000);
    };
  });
  after(() => db.close());

  describe('on startup', () => {
    it('should start the NoFlo process', function (done) {
      this.timeout(75000);
      const checkNoFlo = () => {
        chai.expect(win.nofloStarted).to.be.a('boolean');
        if (win.nofloDBReady) {
          chai.expect(win.nofloDBReady).to.be.a('boolean');
          done();
          return;
        }
        setTimeout(checkNoFlo, 1000);
      };
      setTimeout(checkNoFlo, 1000);
    });

    it('should start with the main screen', () => chai.expect(win.location.hash).to.equal(''));
  });

  describe('NoFlo PrepareStorage', () => {
    it('should have created the IndexedDB database', function (done) {
      this.timeout(4000);
      const indexedDB = win.overrideIndexedDB || win.indexedDB;
      chai.expect(indexedDB).to.exist;
      const req = indexedDB.open('noflo-ui', 4);
      req.onerror = (err) => done(err);
      req.onupgradeneeded = function (e) {
        e.target.transaction.abort();
        return done(new Error('We didn\'t get a ready database'));
      };
      req.onsuccess = function (event) {
        db = event.target.result;
        chai.expect(db.name).to.equal('noflo-ui');
        chai.expect(db.version).to.equal(4);
        return done();
      };
    });
    it('should have created the project store', () => chai.expect(db.objectStoreNames.contains('projects')).to.equal(true));
    it('should have created the graph store', () => chai.expect(db.objectStoreNames.contains('graphs')).to.equal(true));
    it('should have created the component store', () => chai.expect(db.objectStoreNames.contains('components')).to.equal(true));
    it('should have created the runtime store', () => chai.expect(db.objectStoreNames.contains('runtimes')).to.equal(true));
    it('should have created the spec store', () => chai.expect(db.objectStoreNames.contains('specs')).to.equal(true));
  });
});
