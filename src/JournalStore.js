const { journal } = require('fbp-graph');

class IDBJournalStore extends journal.JournalStore {
  constructor(graph, db) {
    super(graph);
    this.db = db;
    this.transactions = [];
  }

  genKey(revId) { return `${this.graph.properties.id}_${revId}`; }

  putTransaction(revId, entries) {
    super.putTransaction(revId, entries);

    const trans = this.db.transaction(['journals'], 'readwrite');
    const store = trans.objectStore('journals');

    // We're using add for writing, which will correctly fail if revId alreadyn exists
    // for the graph
    store.add({
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
    idx.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) { return cb(); }
      this.transactions[cursor.value.revId] = cursor.value.entries;
      if (cursor.value.revId > this.lastRevision) { this.lastRevision = cursor.value.revId; }
      return (cursor.continue)();
    };
  }
}

exports.IDBJournalStore = IDBJournalStore;
