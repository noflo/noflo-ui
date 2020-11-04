import { Polymer } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-node-inspector';
import './noflo-edge-menu';
import './noflo-edge-inspector';

Polymer({
  is: 'noflo-packets',
  properties: {
    currentgraph: { value: null },
    edgeInspectors: {
      type: Object,
      value() {
        return {};
      },
    },
    edges: {
      type: Array,
      value() {
        return [];
      },
      observer: 'edgesChanged',
    },
    editor: { value: null },
    events: {
      type: Array,
      value() {
        return [];
      },
      observer: 'eventsChanged',
    },
    packets: {
      type: Array,
      value() {
        return [];
      },
      observer: 'packetsChanged',
    },
    nodeInspectors: {
      type: Object,
      value() {
        return {};
      },
    },
    nodes: {
      type: Array,
      value() {
        return [];
      },
      observer: 'nodesChanged',
    },
    panel: { value: null },
    readonly: { notify: true },
  },
  attached() {
    window.addEventListener('keyup', (e) => {
      if (e.keyCode === 27) {
        this.clearSelection();
      }
    });
  },
  clearSelection() {
    let edge; let
      node;
    // Clear selections on Esc
    while (this.edges.length) {
      edge = this.pop('edges');
      edge.selected = false;
    }
    while (this.nodes.length) {
      node = this.pop('nodes');
      node.selected = false;
    }
  },
  edgesChanged() {
    if (this.edges.length) {
      this.showEdgeCards();
    } else {
      this.hideEdgeCards();
    }
  },
  eventsChanged() {
    // Clear previous state
    if (this.editor) {
      this.editor.clearErrorNodes();
    }
    Object.keys(this.nodeInspectors).forEach((id) => {
      this.nodeInspectors[id].inspector.errorLog = [];
    });

    if (!this.events) {
      return;
    }
    this.events.forEach((event) => {
      if (event.type !== 'processerror' || !event.payload.id) {
        return;
      }
      // TODO: Check that process is in current graph
      if (this.editor) {
        this.editor.addErrorNode(event.payload.id);
      }
      if (this.nodeInspectors[event.payload.id]) {
        this.nodeInspectors[event.payload.id].inspector.push('errorLog', event);
      }
    });
  },
  genId(source, target) {
    let fromStr;
    if (source) {
      fromStr = `${source.node} ${source.port.toUpperCase()}`;
    } else {
      fromStr = 'DATA';
    }
    const toStr = `${target.port.toUpperCase()} ${target.node}`;
    return `${fromStr} -> ${toStr}`;
  },
  genEdgeId(edge) {
    return this.genId(edge.from, edge.to);
  },
  showEdgeCards() {
    if (this.edgeMenu) {
      if (this.readonly) {
        PolymerDom(PolymerDom(this.edgeMenu).parentNode).removeChild(this.edgeMenu);
        this.edgeMenu = null;
      } else {
        this.set('edgeMenu.dialog.edges', this.edges);
      }
    } else if (!this.readonly) {
      const menu = document.createElement('noflo-edge-menu');
      menu.edges = this.edges;
      menu.graph = this.currentgraph;
      this.edgeMenu = document.createElement('the-card');
      this.set('edgeMenu.type', 'edge-menu');
      this.set('edgeMenu.dialog', menu);
      PolymerDom(this.edgeMenu).appendChild(menu);
      this.edgeMenu.addTo(this.panel);
    }
    this.edges.forEach((edge) => {
      const id = this.genEdgeId(edge);
      if (this.edgeInspectors[id]) {
        return;
      }
      const inspector = document.createElement('noflo-edge-inspector');
      inspector.log = this.packets.filter((packet) => {
        const packetId = this.genId(packet.src, packet.tgt);
        return (packetId === id);
      });
      inspector.graph = this.currentgraph;
      inspector.edge = edge;
      this.edgeInspectors[id] = document.createElement('the-card');
      this.edgeInspectors[id].type = 'edge-inspector';
      this.edgeInspectors[id].inspector = inspector;
      PolymerDom(this.edgeInspectors[id]).appendChild(inspector);
      this.edgeInspectors[id].addTo(this.panel);
    });
    let found;
    Object.keys(this.edgeInspectors).forEach((id) => {
      found = false;
      this.edges.forEach((edge) => {
        if (this.genEdgeId(edge) === id) {
          found = true;
        }
      });
      if (!found) {
        PolymerDom(PolymerDom(this.edgeInspectors[id]).parentNode)
          .removeChild(this.edgeInspectors[id]);
        delete this.edgeInspectors[id];
      }
    });
  },
  packetsChanged() {
    this.edges.forEach((edge) => {
      const id = this.genEdgeId(edge);
      if (!this.edgeInspectors[id] || !this.edgeInspectors[id].inspector) {
        return;
      }
      this.edgeInspectors[id].inspector.log = this.packets.filter((packet) => {
        const packetId = this.genId(packet.src, packet.tgt);
        return (packetId === id);
      });
    });
  },
  hideEdgeCards() {
    if (this.edgeMenu) {
      PolymerDom(PolymerDom(this.edgeMenu).parentNode).removeChild(this.edgeMenu);
      this.edgeMenu = null;
    }
    Object.keys(this.edgeInspectors).forEach((id) => {
      PolymerDom(PolymerDom(this.edgeInspectors[id]).parentNode)
        .removeChild(this.edgeInspectors[id]);
      delete this.edgeInspectors[id];
    });
  },
  nodesChanged() {
    if (this.nodes.length) {
      this.showNodeCards();
    } else {
      this.hideNodeCards();
    }
  },
  showNodeCards() {
    this.nodes.forEach((node) => {
      const { id } = node;
      if (this.nodeInspectors[id]) {
        return;
      }
      if (this.readonly) {
        return;
      }
      const inspector = document.createElement('noflo-node-inspector');
      inspector.node = node;
      inspector.component = this.editor.getComponent(node.component);
      inspector.graph = this.currentgraph;
      if (this.events) {
        inspector.errorLog = this.events.filter((event) => {
          if (event.type !== 'processerror') {
            return false;
          }
          if (event.payload.id !== id) {
            return false;
          }
          return true;
        });
      }
      this.nodeInspectors[id] = document.createElement('the-card');
      this.nodeInspectors[id].type = 'node-inspector';
      this.nodeInspectors[id].inspector = inspector;
      PolymerDom(this.nodeInspectors[id]).appendChild(inspector);
      this.nodeInspectors[id].addTo(this.panel);
    });
    let found;
    Object.keys(this.nodeInspectors).forEach((id) => {
      found = false;
      this.nodes.forEach((node) => {
        if (node.id === id) {
          found = true;
        }
      });
      if (!found) {
        PolymerDom(PolymerDom(this.nodeInspectors[id]).parentNode)
          .removeChild(this.nodeInspectors[id]);
        delete this.nodeInspectors[id];
      }
    });
  },
  hideNodeCards() {
    Object.keys(this.nodeInspectors).forEach((id) => {
      PolymerDom(PolymerDom(this.nodeInspectors[id]).parentNode)
        .removeChild(this.nodeInspectors[id]);
      delete this.nodeInspectors[id];
    });
  },
});
