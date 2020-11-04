import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import './the-graph';

Polymer({
  _template: html`
    <the-graph id="graph" menus="{{menus}}" width="{{width}}" height="{{height}}" pan="{{pan}}" scale="{{scale}}" autolayout="{{autolayout}}" readonly="{{readonly}}" theme="{{theme}}" selected-nodes="{{selectedNodes}}" error-nodes="{{errorNodes}}" selected-edges="{{selectedEdges}}" animated-edges="{{animatedEdges}}" display-selection-group="{{displaySelectionGroup}}" force-selection="{{forceSelection}}" icons="[[icons]]">
    </the-graph>
`,

  is: 'the-graph-editor',

  attached() {
    this.$.graph.getMenuDef = this.getMenuDef;
  },

  properties: {
    icons: {
      type: Object,
      value() {
        return {};
      },
    },
    animatedEdges: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    autolayout: {
      type: Boolean,
      value: false,
      notify: true,
    },
    copyNodes: {
      type: Array,
      value() {
        return [];
      },
    },
    displaySelectionGroup: {
      type: Boolean,
      value: true,
      notify: true,
    },
    errorNodes: {
      type: Object,
      value() {
        return {};
      },
      notify: true,
    },
    forceSelection: {
      type: Boolean,
      value: false,
      notify: true,
    },
    graph: {
      value: null,
      notify: true,
      observer: 'graphChanged',
    },
    grid: {
      type: Number,
      value: 72,
      notify: true,
    },
    height: {
      type: Number,
      value: 600,
      notify: true,
      observer: 'heightChanged',
    },
    menus: { value: null },
    notifyView: { observer: 'notifyViewChanged' },
    onContextMenu: { notify: true },
    pan: { observer: 'panChanged' },
    plugins: {
      type: Object,
      value() {
        return {};
      },
    },
    readonly: { notify: true },
    scale: {
      type: Number,
      value: 1,
      observer: 'scaleChanged',
    },
    selectedEdges: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    selectedNodes: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    snap: {
      type: Number,
      value: 36,
      notify: true,
    },
    theme: {
      type: String,
      value: 'dark',
      notify: true,
      observer: 'themeChanged',
    },
    width: {
      type: Number,
      value: 800,
      notify: true,
      observer: 'widthChanged',
    },
  },

  ready() {
    this.pan = [
      0,
      0,
    ];
    this.menus = TheGraph.editor.getDefaultMenus(this);
  },

  detached() {
    Object.keys(this.plugins).forEach((name) => {
      this.plugins[name].unregister(this);
      delete this.plugins[name];
    });
  },

  addPlugin(name, plugin) {
    this.set(`plugins.${name}`, plugin);
    plugin.register(this);
  },

  addMenu(type, options) {
    // options: icon, label
    this.set(`menus.${type}`, options);
  },

  addMenuCallback(type, callback) {
    if (!this.menus[type]) {
      return;
    }
    this.set(`menus.${type}.callback`, callback);
  },

  addMenuAction(type, direction, options) {
    if (!this.menus[type]) {
      this.set(`menus.${type}`, {});
    }
    const menu = this.menus[type];
    menu[direction] = options;
  },

  getMenuDef(options) {
    // Options: type, graph, itemKey, item
    if (options.type && this.menus[options.type]) {
      const defaultMenu = this.menus[options.type];
      if (defaultMenu.callback) {
        return defaultMenu.callback(defaultMenu, options);
      }
      return defaultMenu;
    }
    return null;
  },

  notifyViewChanged() {
    const view = {
      scale: this.scale,
      pan: this.pan,
      width: this.width,
      height: this.height,
    };
    this.fire('viewchanged', view);
  },

  panChanged() {
    this.notifyViewChanged();
  },

  scaleChanged() {
    this.notifyViewChanged();
  },

  widthChanged() {
    this.set('style.width', `${this.width}px`);
    this.notifyViewChanged();
  },

  heightChanged() {
    this.set('style.height', `${this.height}px`);
    this.notifyViewChanged();
  },

  themeChanged() {
    this.$.graph.theme = this.theme;
  },

  graphChanged() {
    if (!this.graph) {
      this.set('$.graph.graph', this.graph);
      return;
    }
    if (typeof this.graph.addNode !== 'function') {
      throw new Error('.graph property of the-graph-editor must be a fbp-graph instance (since the-graph 0.8)');
    }
    this.buildInitialLibrary(this.graph);
    this.set('$.graph.graph', this.graph);
  },

  buildInitialLibrary(graph) {
    /* if (Object.keys(this.$.graph.library).length !== 0) {
      // We already have a library, skip
      // TODO what about loading a new graph? Are we making a new editor?
      return;
    } */
    const components = TheGraph.library.componentsFromGraph(graph);
    components.forEach((component) => {
      this.registerComponent(component, true);
    });
  },

  registerComponent(definition, generated) {
    this.$.graph.registerComponent(definition, generated);
  },

  libraryRefresh() {
    this.$.graph.debounceLibraryRefesh();
  },

  rerender() {
    this.$.graph.rerender();
  },

  triggerAutolayout() {
    this.$.graph.triggerAutolayout();
  },

  triggerFit() {
    this.$.graph.triggerFit();
  },

  animateEdge(edge) {
    // Make sure unique
    const index = this.animatedEdges.indexOf(edge);
    if (index === -1) {
      this.push('animatedEdges', edge);
    }
  },

  unanimateEdge(edge) {
    const index = this.animatedEdges.indexOf(edge);
    if (index >= 0) {
      this.splice('animatedEdges', index, 1);
    }
  },

  addErrorNode(id) {
    this.set(`errorNodes.${id}`, true);
    this.updateErrorNodes();
  },

  removeErrorNode(id) {
    this.set(`errorNodes.${id}`, false);
    this.updateErrorNodes();
  },

  clearErrorNodes() {
    this.errorNodes = {};
    this.updateErrorNodes();
  },

  updateErrorNodes() {
    this.$.graph.errorNodesChanged();
  },

  focusNode(node) {
    this.$.graph.focusNode(node);
  },

  getComponent(name) {
    return this.$.graph.getComponent(name);
  },

  getLibrary() {
    return this.$.graph.library;
  },

  toJSON() {
    return this.graph.toJSON();
  },

  hostAttributes: { 'touch-action': 'none' },
});
