import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import ReactDOM from 'react-dom';
import RuntimeEvents from '../src/components/RuntimeEvents';
import './noflo-node-inspector';
import './noflo-edge-menu';
import './the-panel';

Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }
      the-panel {
        background-color: var(--noflo-ui-background) !important;
        transition: left 0.3s ease-in-out, bottom 0.3s ease-in-out, right 0.3s ease-in-out, top 0.3s ease-in-out, width 0.1s ease-in-out;
        position: fixed;
        border: 0px solid var(--noflo-ui-border);
        box-sizing: border-box;
        padding-left: 7px;
        padding-right: 7px;
        bottom: 0px;
        border-top-width: 1px;
        height: 100vh;
        padding-top: 36px;
        z-index: 3;
      }
      the-panel:before {
        font-family: FontAwesomeSVG;
        content: '\\f16c';
        color: var(--noflo-ui-border-highlight);
        position: absolute;
        text-align: center;
        top: 0px;
        height: 36px;
        line-height: 36px;
        left: 50%;
        left: calc(50% - 7px);
        font-size: 17px;
        opacity: 0.25;
        transition: opacity 0.3s ease-in-out;
      }
      the-panel:not([open]):before {
        opacity: 1;
        cursor: n-resize;
      }
      the-panel#fixed main {
        height: 288px;
      }
      the-panel#fixed main .react-fluid-table .cell {
        user-select: text;
        -webkit-user-select: text;
      }
      the-panel#fixed main .react-fluid-table .cell,
      the-panel#fixed main .react-fluid-table .header-cell {
        box-sizing: border-box;
        display: flex;
        padding: 7px;
      }
      the-panel#fixed main .react-fluid-table-container {
        will-change: height;
      }
      the-panel#fixed main .sticky-header {
        position: sticky;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 1;
      }
      the-panel#fixed main .row-wrapper {
        display: nline-block;
      }
      the-panel#fixed main .react-fluid-table-header {
        display: flex;
        border-bottom: 1px solid var(--noflo-ui-border);
        background-color: var(--noflo-ui-background);
        z-index: 2;
      }
      the-panel#fixed main .header-cell {
        align-items: baseline;
      }
      the-panel#fixed main .header-cell-text {
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 10px;
        font-weight: bold;
        line-height: 14px;
        color: var(--noflo-ui-text-highlight);
      }
      the-panel#fixed main .header-cell-arrow {
        width: 0;
        height: 0;
        margin-left: 4px;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
      }
      the-panel#fixed main .header-cell-arrow.asc {
      }
      the-panel#fixed main .header-cell-arrow.desc {
      }
      the-panel#fixed main .react-fluid-table-row {
      }
      the-panel#fixed main .react-fluid-table-row .hidden {
        display: none;
      }
      the-panel#fixed main .react-fluid-table-row .packet-details {
        color: var(--noflo-ui-text);
        background-color: var(--noflo-ui-background);
        box-shadow: var(--noflo-ui-background) 0px 0px 2px;
        border: 1px solid var(--noflo-ui-text-highlight);
        /* This is a workaround for react-fluid-table not recalculating on expand, most likely due to Shadow DOM */
        position: absolute;
        z-index: 1;
        right: 7px;
        width: max(60%, 288px);
        height: 144px;
        overflow-y: auto;
      }
      the-panel#fixed main .react-fluid-table-row .packet-details dl {
        margin: 0px;
        padding: 7px;
        font-size: 10px;
      }
      the-panel#fixed main .react-fluid-table-row .packet-details dt {
        font-weight: bold;
      }
      the-panel#fixed main .react-fluid-table-row .packet-details dd {
        margin: 0px;
      }
      the-panel#fixed main .react-fluid-table-row .packet-details dd.packet-data {
        white-space: pre-wrap;
        user-select: text;
        -webkit-user-select: text;
      }
      the-panel#fixed main .row-container {
        display: flex;
      }
      the-panel#fixed main .cell {
        align-items: center;
        position: relative;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
        line-height: 14px;
        color: var(--noflo-ui-text);
      }
      the-panel#fixed main .cell .expander {
        cursor: pointer;
        height: 1em;
        width: 1em;
        color: var(--noflo-ui-text-highlight);
      }
      the-panel#fixed main .cell .edge {
        font-weight: bold;
      }
      the-panel#fixed main .cell .edge .subgraph {
        margin-right: 7px;
        color: var(--noflo-ui-border);
      }
      the-panel#fixed main .cell .edge .source span {
        margin-right: 7px;
      }
      the-panel#fixed main .cell .edge .target span {
        margin-left: 7px;
      }
      the-panel#fixed main .cell .edge .port-id {
        text-transform: uppercase;
      }
      the-panel#fixed main .cell .edge .arrow {
        margin-left: 7px;
        margin-right: 7px;
      }
      the-panel#fixed main .cell .edge .connection {
        color: var(--noflo-ui-text-highlight);
      }
      the-panel#fixed main .cell .edge .route0 { color: #fff; }
      the-panel#fixed main .cell .edge .route1 { color: hsl(  0,  98%, 46%); }
      the-panel#fixed main .cell .edge .route2 { color: hsl( 35,  98%, 46%); }
      the-panel#fixed main .cell .edge .route3 { color: hsl( 60,  98%, 46%); }
      the-panel#fixed main .cell .edge .route4 { color: hsl(135,  98%, 46%); }
      the-panel#fixed main .cell .edge .route5 { color: hsl(160,  98%, 46%); }
      the-panel#fixed main .cell .edge .route6 { color: hsl(185,  98%, 46%); }
      the-panel#fixed main .cell .edge .route7 { color: hsl(210,  98%, 46%); }
      the-panel#fixed main .cell .edge .route8 { color: hsl(285,  98%, 46%); }
      the-panel#fixed main .cell .edge .route9 { color: hsl(310,  98%, 46%); }
      the-panel#fixed main .cell .edge .route10 { color: hsl(335,  98%, 46%); }
    </style>
    <the-panel id="fixed" edge="bottom" size="324" handle="36" open={{showPackets}}>
      <main id="fixedmain">
      </main>
    </the-panel>
  `,
  is: 'noflo-packets',
  properties: {
    currentgraph: { value: null },
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
    showPackets: {
      type: Boolean,
      value: false,
      notify: true,
    },
    width: {
      type: Number,
      value: 800,
      notify: true,
      observer: 'widthChanged',
    },
    readonly: { notify: true },
  },
  attached() {
    window.addEventListener('keyup', (e) => {
      if (e.keyCode === 27) {
        this.clearSelection();
      }
    });
    this.frameRequest = null;
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
  edgesChanged(newEdges, oldEdges) {
    if (this.edges.length) {
      this.showEdgeCards();
    } else {
      this.hideEdgeCards();
    }
    this.updatePacketInspector();
    if (newEdges.length && !oldEdges.length && this.packets.length) {
      // Show packet inspector when selecting an edge
      this.showPackets = true;
    }
  },
  widthChanged() {
    this.updatePacketInspector();
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
  },
  packetsChanged(newPackets, oldPackets) {
    this.updatePacketInspector();
    if (newPackets.length && !oldPackets.length) {
      // Show packet inspector when first packets arrive
      this.showPackets = true;
    }
    if (!newPackets.length && oldPackets.length) {
      this.showPackets = false;
    }
  },
  updatePacketInspector() {
    if (this.frameRequest) {
      return;
    }
    this.frameRequest = requestAnimationFrame(() => {
      this.frameRequest = null;
      const edgeIds = this.currentgraph
        ? this.currentgraph.edges.map((e) => this.genEdgeId(e)) : [];
      const selectedEdgeIds = this.edges.map((e) => this.genEdgeId(e));
      const packets = this.packets
        .map((p, idx) => {
          const packetId = this.genId(p.src, p.tgt);
          let packetEdge;
          if (this.currentgraph && edgeIds.indexOf(packetId) !== -1) {
            packetEdge = this.currentgraph.edges[edgeIds.indexOf(packetId)];
          }
          return {
            ...p,
            rowId: `${idx + 1}`,
            id: packetId,
            edge: packetEdge,
          };
        })
        .filter((p) => {
          if (!selectedEdgeIds.length) {
            // Show all packets when no edges are selected
            return true;
          }
          return (selectedEdgeIds.indexOf(p.id) !== -1);
        });
      const container = this.shadowRoot.getElementById('fixedmain');
      ReactDOM.render(RuntimeEvents({
        packets,
        width: container.offsetWidth, // TODO: Update on resize
      }), container);
    });
  },
  hideEdgeCards() {
    if (this.edgeMenu) {
      PolymerDom(PolymerDom(this.edgeMenu).parentNode).removeChild(this.edgeMenu);
      this.edgeMenu = null;
    }
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
