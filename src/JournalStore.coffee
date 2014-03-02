noflo = require 'noflo'

class IDBJournalStore extends noflo.journal.JournalStore
  constructor: (graph, @db) ->
    super graph
    @transactions = []

  genKey: (revId) -> "#{@graph.properties.id}_#{revId}"

  putTransaction: (revId, entries) ->
    super revId, entries

    trans = @db.transaction ['journals'], 'readwrite'
    store = trans.objectStore 'journals'

    # We're using add for writing, which will correctly fail if revId alreadyn exists
    # for the graph
    req = store.add
      id: @genKey revId
      graph: @graph.properties.id
      revId: revId
      entries: entries

    @transactions[revId] = entries

  fetchTransaction: (revId) ->
    return @transactions[revId]

  init: (cb) ->
    trans = @db.transaction ['journals']
    store = trans.objectStore 'journals'
    idx = store.index 'graph'
    idx.openCursor().onsuccess = (event) =>
      cursor = event.target.result
      return cb() unless cursor
      @transactions[cursor.value.revId] = cursor.value.entries
      @lastRevision = cursor.value.revId if cursor.value.revId > @lastRevision
      do cursor.continue

exports.IDBJournalStore = IDBJournalStore
