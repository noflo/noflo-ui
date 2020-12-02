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
    </style>
    <section id="contextsection"></section>
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
    dialog.mainGraph = 'false';
    PolymerDom(document.body).appendChild(dialog);
    dialog.addEventListener('new', (event) => {
      // Register new subgraph
      this.fire('newsubgraph', {
        currentGraph,
        subgraph: event.detail,
        nodes: item.nodes,
        project: this.project,
      });
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
    this.set('help.headline', `${process.env.NOFLO_APP_TITLE} graph editor`);
    this.set('help.text', 'Here you can edit your Flow-Based graphs and run them. To add nodes, search for components using the search area on the top-left corner.');
  },

  showHelp(graph) {
    if (!this.help) {
      return;
    }
    this.help.show(`${process.env.NOFLO_APP_TITLE} graph editor`, 'Here you can edit your Flow-Based graphs and run them. To add nodes, search for components using the search area on the top-left corner.');
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
});
