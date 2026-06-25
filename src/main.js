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
    editor.addNode('Source', 100, 200, 
      [], 
      [{ type: 'regular', name: 'out' }]
    );
    
    editor.addNode('Filter', 300, 100, 
      [{ type: 'regular', name: 'in' }], 
      [
        { type: 'regular', name: 'out' },
        { type: 'regular', name: 'error' }
      ]
    );
    
    editor.addNode('Splitter', 300, 300, 
      [{ type: 'regular', name: 'in' }], 
      [{ type: 'array', name: 'out', size: 3 }]
    );
    
    editor.addNode('Aggregator', 500, 300, 
      [{ type: 'array', name: 'in', size: 3 }], 
      [{ type: 'regular', name: 'out' }]
    );
    
    editor.addNode('Logger', 700, 100, 
      [{ type: 'regular', name: 'in' }], 
      []
    );
    
    editor.addNode('Sink', 700, 300, 
      [{ type: 'regular', name: 'in' }], 
      []
    );
    
    editor.fitNodesToViewport();
  }
}

init().catch(console.error);
