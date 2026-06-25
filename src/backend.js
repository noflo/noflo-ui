/**
 * Backend Worker for NoFlo UI
 * Handles CRDT, FBP Protocol communication, and dataflow logic.
 */

self.onmessage = async (event) => {
  const { type, payload } = event.data;
  console.log(`[Backend] Received message of type: ${type}`, payload);

  switch (type) {
    case 'INIT':
      // Initialize CRDT and other backend services
      self.postMessage({ type: 'INIT_DONE', payload: { status: 'ready' } });
      break;
    default:
      console.warn(`[Backend] Unknown message type: ${type}`);
  }
};
