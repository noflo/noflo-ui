describe('Storage Middleware', () => {
  const baseDir = 'noflo-ui';
  let mw = null;
  let idb = null;
  let component = null;
  before(function (done) {
    this.timeout(4000);
    mw = window.middleware('ui/StorageMiddleware', baseDir);
    return mw.before(done);
  });
  beforeEach(() => mw.beforeEach());
  afterEach(() => mw.afterEach());
  describe('receiving a runtime:connect action', () => it('should pass it out as-is', (done) => {
    const action = 'runtime:connect';
    const payload = { hello: 'world' };
    mw.receivePass(action, payload, done);
    return mw.send(action, payload);
  }));
  describe('receiving a noflo:ready action', () => it('should send storage:db with IndexedDB instance', (done) => {
    const action = 'noflo:ready';
    const payload = null;
    const check = function (data) {
      chai.expect(data.name).to.equal('noflo-ui');
      return idb = data;
    };
    mw.receiveAction('storage:db', check, done);
    return mw.send(action, payload, {});
  }));
  describe('receiving a storage:save:component action', () => it('should send a storage:stored:component action', (done) => {
    const action = 'storage:save:component';
    const comp = {
      name: 'Foo',
      language: 'python',
      project: 'baz',
      code: '',
      tests: '',
    };
    const check = function (data) {
      chai.expect(data).to.eql(comp);
      return component = data;
    };
    mw.receiveAction('storage:stored:component', check, done);
    return mw.send(action, comp,
      { db: idb });
  }));
  describe('receiving a storage:load:all action', () => it('should send a storage:stored:initial action', (done) => {
    const action = 'storage:load:all';
    const check = (data) => {
      chai.expect(data).to.be.an('object');
      chai.expect(data).to.have.all.keys('projects', 'graphs', 'components', 'specs', 'runtimes');
      chai.expect(data.components[0]).to.eql(component);
    };
    mw.receiveAction('storage:stored:initial', check, done);
    return mw.send(action, {},
      { db: idb });
  }));
  describe('receiving a storage:delete:component action', () => it('should send a storage:removed:component action', (done) => {
    const action = 'storage:delete:component';
    const check = data => chai.expect(data).to.equal(component.id);
    mw.receiveAction('storage:removed:component', check, done);
    return mw.send(action, component,
      { db: idb });
  }));
});
