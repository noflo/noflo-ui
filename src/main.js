/**
 * Main entry point for NoFlo UI
 */

import { FlowEditor } from './elements/flow-editor.js';
import { FlowNode } from './elements/flow-node.js';

const backend = new Worker('src/backend.js', { type: 'module' });

backend.onmessage = (event) => {
  const { type, payload } = event.data;
  console.log(`[Main] Received from backend: ${type}`, payload);
};

async function init() {
  console.log('Initializing NoFlo UI...');
  
  // Initialize backend
  backend.postMessage({ type: 'INIT', payload: {} });

  // Register Web Components
  customElements.define('flow-editor', FlowEditor);
  customElements.define('flow-node', FlowNode);

  // Initial setup
  const app = document.getElementById('app');
  if (app) {
    const editor = document.createElement('flow-editor');
    app.appendChild(editor);
    
    // Add some sample nodes
    editor.addNode('Input', 100, 100, 0, 1);
    editor.addNode('Process 1', 300, 100, 
      [{ type: 'regular', name: 'in' }], 
      [{ type: 'array', name: 'out', size: 3 }]
    );
    editor.addNode('Process 2', 300, 200, 
      [{ type: 'array', name: 'in', size: 3 }], 
      [{ type: 'regular', name: 'out' }]
    );
    editor.addNode('Output', 500, 150, 2, 0);
    
    editor.fitNodesToViewport();
  }
}

init().catch(console.error);
