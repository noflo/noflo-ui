import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-exported-inspector';
import './noflo-new-graph';
import './noflo-group-inspector';
import './the-card';
import './the-panel';

Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }
      #contextsection {
        position: fixed;
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        left: 36px;
        top: 72px;
        width: calc(72px * 4);
        max-height: calc(100% - 72px);
        box-sizing: border-box;
        display: block;
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        overflow-x: visible;
      }
      the-panel {
        background-color: var(--noflo-ui-background) !important;
        transition: left 0.3s ease-in-out, bottom 0.3s ease-in-out, right 0.3s ease-in-out, top 0.3s ease-in-out, width 0.1s ease-in-out;
        position: fixed;
        border: 0px solid var(--noflo-ui-border);
        box-sizing: border-box;
        padding-top: 72px;
        top: 0px;
        border-left-width: 1px;
        height: 100vh;
        padding-left: 36px;
        z-index: 3;
      }
      the-panel:before {
        font-family: FontAwesomeSVG;
        content: '\\f188';
        color: var(--noflo-ui-border-highlight);
        position: absolute;
        text-align: center;
        left: 0px;
        width: 36px;
        top: 50%;
        top: calc(50% - 7px);
        font-size: 17px;
        opacity: 0.25;
        transition: opacity 0.3s ease-in-out;
      }
      the-panel:not([open]):before {
        opacity: 1;
        cursor: w-resize;
      }
      the-panel footer {
        position: absolute;
        bottom: 0px;
        right: 0px;
      }
      the-panel#fixed header {
        display: flex;
        justify-content: space-between;
        width: calc(72px * 4);
        padding-right: 36px;
        box-sizing: border-box;
      }
      the-panel#fixed header ul.toolbar {
        margin: 0px;
        padding: 0px;
      }
      the-panel#fixed header ul.toolbar li {
        width: calc(100%/2);
        height: 36px;
        text-align: center;
        margin: 0px;
        margin-right: 0px;
        list-style: none;
      }
      the-panel#fixed header ul.toolbar button {
        width: 36px;
        height: 36px;
        font-size: 10px;
        background-color: transparent;
        border: none;
        color: var(--noflo-ui-text);
        text-align: center;
        cursor: pointer;
      }
      the-panel#fixed header h1 {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 15px;
        font-weight: normal;
        line-height: 36px;
        width: 100%;
        color: var(--noflo-ui-text);
        padding: 0px;
        margin: 0px;
      }
      the-panel#fixed main {
        height: calc(100% - 72px);
        overflow-y: scroll;
        overflow-x: hidden;
        width: calc(72px * 4);
      }
      the-panel#fixed main p {
        font-size: 10px;
        line-height: 14px;
        color: var(--noflo-ui-text-highlight);
      }
      the-panel#fixed main ul {
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        margin-top: 0px;
        padding-top: 0px;
        margin-left: 0px;
        padding-left: 0px;
        width: 252px;
      }
      the-panel#fixed main li {
        font-size: 10px;
        line-height: 14px;
        margin-left: 0px;
        padding-left: 0px;
        margin-bottom: 0px;
        color: var(--noflo-ui-text-highlight);
        margin-bottom: 4px;
        padding-bottom: 2px;
        border-bottom: 1px hsla(190, 100%, 30%, 0.4) solid;
        list-style: none;
      }
      the-panel#fixed main li.error,
      the-panel#fixed main li.processerror,
      the-panel#fixed main li.networkerror,
      the-panel#fixed main li.protocolerror {
        color: hsl(  0,  98%, 46%);
      }
      the-panel#fixed main li pre {
        color: rgba(179, 222, 230, 0.5);
        font-size: 8px;
      }
      the-panel#fixed main li.output {
        color: var(--noflo-ui-text);
      }
    </style>
    <section id="contextsection"></section>
    <the-panel id="fixed" edge="right" size="324" handle="36">
      <header slot="header">
        <h1>Runtime events</h1>
        <template is="dom-if" if="[[events.length]]">
          <ul class="toolbar">
            <li>
              <button id="clear" on-click="clearEvents" class="blue-button" title="Clear Event Log">
                <noflo-icon icon="ban"></noflo-icon>
              </button>
             </li>
          </ul>
        </template>
      </header>
      <main id="fixedmain">
        <template is="dom-if" if="[[runtime]]">
          <ul>
          <template is="dom-repeat" items="[[events]]" as="event">
            <li class\$="{{ event.type }}">
              <template is="dom-if" if="[[_ifEventIsPlain(event)]]">
                {{ event.type }}
              </template>
              <template is="dom-if" if="[[_ifEventIsProcessError(event)]]">
                {{ event.payload.error }}
              </template>
              <template is="dom-if" if="[[_ifEventIsError(event)]]">
                {{ event.payload.message }}
                <template is="dom-if" if="[[_ifEventHasStack(event)]]"><pre>{{ event.payload.stack }}</pre></template>
              </template>
              <template is="dom-if" if="[[_ifEventIsOutput(event)]]">
                {{ event.payload.message }}
              </template>
              <template is="dom-if" if="[[_ifEventIsStopStart(event)]]">
                {{ event.payload.graph }} {{ event.type }}
              </template>
            </li>
          </template>
          </ul>
        </template>
        <template is="dom-if" if="[[!runtime]]">
          <p>Not connected to a runtime.</p>
        </template>
      </main>
      <footer slot="footer"></footer>
    </the-panel>
`,

  is: 'noflo-context',

  properties: {
    component: {
      type: String,
      value: '',
      notify: true,
      observer: 'componentChanged',
    },
    edge: { notify: true },
    edges: {
      type: Array,
      value() {
        return [];
      },
      observer: 'edgesChanged',
    },
    events: {
      type: Array,
      value() {
        return [];
      },
      observer: 'eventsChanged',
    },
    editor: {
      value: null,
      observer: 'editorChanged',
    },
    errors: {
      type: Array,
      value() {
        return [];
      },
    },
    graphs: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    help: { value: null },
    node: { notify: true },
    nodes: {
      type: Array,
      value() {
        return [];
      },
    },
    project: {
      value: null,
      notify: true,
    },
    readonly: { notify: true },
    runtime: { value: null },
    runtimes: {
      type: Array,
      value() {
        return [];
      },
    },
    search: {
      value: null,
      notify: true,
    },
  },

  attached() {
    this.contextBar = this.$.contextsection;
    window.addEventListener('keyup', (e) => {
      if (e.keyCode === 27) {
        this.clearSelection();
      }
    });
    // Workaround for https://github.com/Polymer/PointerEvents/issues/134
    document.addEventListener('touchstart', () => {
    });
    this.help = PolymerDom(document).querySelector('noflo-help');
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

  getpanel() {
    this.fire('toolpanel', this.$.fixed);
    this.fire('contextpanel', this.$.contextsection);
  },

  editorChanged() {
    if (!this.editor) {
      return;
    }
    const emptyOnReadOnly = (defaultMenu) => {
      if (this.readonly) {
        return {};
      }
      return defaultMenu;
    };
    this.editor.addMenuCallback('main', emptyOnReadOnly);
    this.editor.addMenuCallback('edge', emptyOnReadOnly);
    this.editor.addMenuCallback('node', (defaultMenu, options) => {
      const localMenu = emptyOnReadOnly(defaultMenu, options);
      if (!options.item.component) {
        return localMenu;
      }
      if (!this.canGetSource(options.item.component)) {
        return localMenu;
      }
      localMenu.n4 = {
        icon: 'arrow-circle-o-up',
        iconLabel: 'open',
        action: (graph, itemKey, item) => {
          if (typeof ga === 'function') {
            ga('send', 'event', 'menu', 'click', 'openNode');
          }
          let hash = window.location.href.split('#')[1] || '';
          if (graph === this.graphs[0] && graph.properties.id) {
            const currentGraphId = encodeURIComponent(graph.properties.id);
            if (hash.indexOf(currentGraphId) === -1) {
              hash += `/${currentGraphId}`;
            }
          }
          window.location.hash = `${hash}/${encodeURIComponent(item.id)}`;
        },
      };
      return localMenu;
    });
    this.editor.addMenuCallback('nodeInport', emptyOnReadOnly);
    this.editor.addMenuCallback('nodeOutport', emptyOnReadOnly);
    this.editor.addMenuCallback('graphInport', (defaultMenu, options) => {
      if (this.readonly) {
        return emptyOnReadOnly(defaultMenu, options);
      }
      return {
        ...defaultMenu,
        n4: {
          icon: 'pencil-square-o',
          iconLabel: 'rename',
          action: (graph, itemKey, item) => {
            const dialog = document.createElement('noflo-exported-inspector');
            dialog.graph = this.graphs[this.graphs.length - 1];
            dialog.publicport = itemKey;
            dialog.privateport = item;
            dialog.direction = 'input';
            PolymerDom(document.body).appendChild(dialog);
          },
        },
      };
    });
    this.editor.addMenuCallback('graphOutport', (defaultMenu, options) => {
      if (this.readonly) {
        return emptyOnReadOnly(defaultMenu, options);
      }
      return {
        ...defaultMenu,
        n4: {
          icon: 'pencil-square-o',
          iconLabel: 'rename',
          action: (graph, itemKey, item) => {
            const dialog = document.createElement('noflo-exported-inspector');
            dialog.graph = this.graphs[this.graphs.length - 1];
            dialog.publicport = itemKey;
            dialog.privateport = item;
            dialog.direction = 'output';
            PolymerDom(document.body).appendChild(dialog);
          },
        },
      };
    });
    this.editor.addMenuCallback('group', emptyOnReadOnly);
    this.editor.addMenuCallback('selection', (defaultMenu, options) => {
      if (this.readonly) {
        return emptyOnReadOnly(defaultMenu, options);
      }
      return {
        ...defaultMenu,
        e4: {
          icon: 'sitemap',
          iconLabel: 'graph',
          action: this.subgraph.bind(this),
        },
        w4: {
          icon: 'square-o',
          iconLabel: 'group',
          action: this.group.bind(this),
        },
      };
    });
  },

  edgesChanged() {
    this.fire('edges', this.edges);
  },

  eventsChanged() {
    this.$.fixedmain.scrollTop = this.$.fixedmain.scrollHeight;
  },

  componentChanged() {
    if (this.component && typeof this.component === 'object' && !this.component.name) {
      this.component = null;
    }
    if (this.component && typeof ga === 'function') {
      ga('send', 'event', 'url', 'navigation', 'openComponent');
    }
    this.fire('component', this.component);
  },

  group(graph, itemKey, item) {
    if (this.readonly) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'menu', 'click', 'createGroup');
    }
    // See if the nodes are already part of a group
    let group = '';
    let description = '';
    const selectedNodes = item.nodes;
    selectedNodes.sort();
    graph.groups.forEach((grp) => {
      const grpNodes = JSON.parse(JSON.stringify(grp.nodes));
      grpNodes.sort();
      if (grpNodes.join(',') === selectedNodes.join(',')) {
        group = grp.name;
        description = grp.metadata.description;
      }
    });
    const dialog = document.createElement('noflo-group-inspector');
    dialog.group = group;
    dialog.groupdescription = description;
    dialog.nodes = selectedNodes;
    dialog.graph = graph;
    PolymerDom(document.body).appendChild(dialog);
  },

  subgraph(currentGraph, itemKey, item) {
    if (!this.project || this.readonly) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'menu', 'click', 'createSubgraph');
    }
    // Ask user to name the new subgraph
    const dialog = document.createElement('noflo-new-graph');
    dialog.runtimes = this.runtimes;
    dialog.type = currentGraph.properties.environment.type;
    dialog.project = this.project;
    PolymerDom(document.body).appendChild(dialog);
    dialog.addEventListener('new', (event) => {
      const graph = event.detail;
      graph.startTransaction('newsubgraph');
      graph.setProperties({
        id: `${currentGraph.properties.project}/${graph.name.replace(' ', '_')}`,
        project: currentGraph.properties.project,
        main: false,
      });
      // Copy nodes
      item.nodes.forEach((id) => {
        const node = currentGraph.getNode(id);
        graph.addNode(node.id, node.component, node.metadata);
      });
      // Copy edges between nodes
      currentGraph.edges.forEach((edge) => {
        if (graph.getNode(edge.from.node) && graph.getNode(edge.to.node)) {
          graph.addEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port, edge.metadata);
        }
      });
      // Move IIPs to subgraph as well
      currentGraph.initializers.forEach((iip) => {
        if (graph.getNode(iip.to.node)) {
          graph.addInitial(iip.from.data, iip.to.node, iip.to.port, iip.metadata);
        }
      });
      // Create subgraph node
      const initialMetadata = currentGraph.getNode(item.nodes[0]).metadata;
      currentGraph.startTransaction('subgraph');
      currentGraph.addNode(graph.properties.id, `${this.project.namespace}/${graph.name}`, {
        label: graph.name,
        x: initialMetadata.x,
        y: initialMetadata.y,
      });
      const subgraphPort = (node, port) => {
        const portName = `${node}.${port}`;
        return portName.replace(/(.*)\/(.*)(_.*)\.(.*)/, '$2_$4').toLowerCase();
      };
      // Reconnect external edges to subgraph node
      currentGraph.edges.forEach((edge) => {
        // Edge from outside the new subgraph to a subgraph port
        if (!graph.getNode(edge.from.node) && graph.getNode(edge.to.node)) {
          // Create exported inport
          const inport = subgraphPort(edge.to.node, edge.to.port);
          graph.addInport(inport, edge.to.node, edge.to.port);
          currentGraph.addEdge(edge.from.node, edge.from.port, graph.properties.id, inport);
        }
        // Edge from subgraph port to the outside
        if (graph.getNode(edge.from.node) && !graph.getNode(edge.to.node)) {
          const outport = subgraphPort(edge.from.node, edge.from.port);
          graph.addOutport(outport, edge.from.node, edge.from.port);
          currentGraph.addEdge(graph.properties.id, outport, edge.to.node, edge.to.port);
        }
      });
      // Remove the selected nodes
      item.nodes.forEach((id) => {
        currentGraph.removeNode(id);
      });
      // Emit new subgraph so that it can be stored
      graph.endTransaction('newsubgraph');
      this.fire('newgraph', graph);
      // End the transaction on the main graph
      setTimeout(() => {
        currentGraph.endTransaction('subgraph');
      }, 5);
      // Editor deselect, hide node inspectors
      if (this.editor) {
        this.editor.selectedNodes = [];
      }
    });
  },

  setHelp() {
    // If manually triggered, show something relevant
    if (!this.help) {
      return;
    }
    this.set('help.headline', '$NOFLO_APP_TITLE graph editor');
    this.set('help.text', 'Here you can edit your Flow-Based graphs and run them. To add nodes, search for components using the search area on the top-left corner.');
  },

  showHelp(graph) {
    if (!this.help) {
      return;
    }
    this.help.show('$NOFLO_APP_TITLE graph editor', 'Here you can edit your Flow-Based graphs and run them. To add nodes, search for components using the search area on the top-left corner.');
    graph.once('addNode', () => {
      this.help.close();
    });
  },

  libraryMatch(library, project) {
    const namespace = project.namespace || project.id;
    if (library === namespace) {
      return true;
    }
    if (library === namespace.replace('noflo-')) {
      return true;
    }
    return false;
  },

  canGetSource(component) {
    const componentParts = component.split('/');
    if (componentParts.length > 1
      && this.project
      && this.libraryMatch(componentParts.shift(), this.project)) {
      // Local component, see if it is available
      for (let i = 0; i < this.project.graphs.length; i += 1) {
        if (this.project.graphs[i].name === componentParts[0]) {
          return true;
        }
        if (this.project.graphs[i].properties.id === componentParts[0]) {
          return true;
        }
      }
      for (let i = 0; i < this.project.components.length; i += 1) {
        if (this.project.components[i].name === componentParts[0]) {
          return true;
        }
      }
    }
    // Otherwise we check if Runtime can get it for us
    if (!this.runtime.definition || !this.runtime.definition.capabilities) {
      return false;
    }
    if (this.runtime.definition.capabilities.indexOf('component:getsource') === -1) {
      return false;
    }
    return this.runtime.status.online;
  },

  clearEvents() {
    this.fire('clear:runtimeevents', {
      all: true,
    });
  },

  _ifEventIsPlain(event) {
    return (['stopped', 'started', 'output', 'error', 'processerror', 'networkerror', 'protocolerror'].indexOf(event.type) === -1);
  },

  _ifEventIsProcessError(event) {
    return (['processerror'].indexOf(event.type) !== -1);
  },

  _ifEventIsError(event) {
    return (['error', 'networkerror', 'protocolerror'].indexOf(event.type) !== -1);
  },

  _ifEventHasStack(event) {
    return (['error', 'networkerror'].indexOf(event.type) !== -1 && event.payload.stack && event.payload.stack.length && event.payload.message.indexOf('Runtime sent invalid') === -1);
  },

  _ifEventIsOutput(event) {
    return (event.type === 'output' && event.payload.message);
  },

  _ifEventIsStopStart(event) {
    return (['stopped', 'started'].indexOf(event.type) !== -1 && event.payload.graph);
  },
});
