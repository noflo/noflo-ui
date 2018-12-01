const noflo = require('noflo');

class IDBJournalStore extends noflo.journal.JournalStore {
  constructor(graph, db) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      const thisFn = (() => this).toString();
      const thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.db = db;
    super(graph);
    this.transactions = [];
  }

  genKey(revId) { return `${this.graph.properties.id}_${revId}`; }

  putTransaction(revId, entries) {
    super.putTransaction(revId, entries);

    const trans = this.db.transaction(['journals'], 'readwrite');
    const store = trans.objectStore('journals');

    // We're using add for writing, which will correctly fail if revId alreadyn exists
    // for the graph
    const req = store.add({
      id: this.genKey(revId),
      graph: this.graph.properties.id,
      revId,
      entries,
    });

    this.transactions[revId] = entries;
    return super.putTransaction(revId, entries);
  }

  fetchTransaction(revId) {
    return this.transactions[revId];
  }

  init(cb) {
    const trans = this.db.transaction(['journals']);
    const store = trans.objectStore('journals');
    const idx = store.index('graph');
    return idx.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) { return cb(); }
      this.transactions[cursor.value.revId] = cursor.value.entries;
      if (cursor.value.revId > this.lastRevision) { this.lastRevision = cursor.value.revId; }
      return (cursor.continue)();
    };
  }
}

exports.IDBJournalStore = IDBJournalStore;
