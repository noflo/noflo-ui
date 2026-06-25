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
    const source = editor.addNode('Source', 100, 200, 
      [], 
      [{ type: 'regular', name: 'out' }]
    );
    
    const filter = editor.addNode('Filter', 300, 100, 
      [{ type: 'regular', name: 'in' }], 
      [
        { type: 'regular', name: 'out' },
        { type: 'regular', name: 'error' }
      ]
    );
    
    const splitter = editor.addNode('Splitter', 300, 300, 
      [{ type: 'regular', name: 'in' }], 
      [{ type: 'array', name: 'out', size: 3 }]
    );
    
    const aggregator = editor.addNode('Aggregator', 500, 300, 
      [{ type: 'array', name: 'in', size: 3 }], 
      [{ type: 'regular', name: 'out' }]
    );
    
    const logger = editor.addNode('Logger', 700, 100, 
      [{ type: 'regular', name: 'in' }], 
      []
    );
    
    const sink = editor.addNode('Sink', 700, 300, 
      [{ type: 'regular', name: 'in' }], 
      []
    );

    // Initial connections
    editor.connectNodes(source, 'out', filter, 'in');
    editor.connectNodes(source, 'out', splitter, 'in');
    
    editor.connectNodes(filter, 'out', logger, 'in');
    
    // Connect only some ArrayPorts to allow testing
    editor.connectNodes(splitter, `out[0]`, aggregator, `in[0]`);
    editor.connectNodes(splitter, `out[2]`, aggregator, `in[2]`);
    
    editor.connectNodes(aggregator, 'out', sink, 'in');
    
    editor.fitNodesToViewport();
  }
}

init().catch(console.error);
