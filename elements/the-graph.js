import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import { unnamespace } from '../src/collections';
import './the-graph-styles';

Polymer({
  _template: html`
    <style include="the-graph-styles">
    </style>
    <div id="svgcontainer"></div>
`,

  is: 'the-graph',

  properties: {
    icons: {
      type: Object,
      value() {
        return {};
      },
      observer: 'iconsChanged',
    },
    animatedEdges: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'animatedEdgesChanged',
    },
    appView: { value: null },
    autolayout: {
      type: Boolean,
      value: false,
      notify: true,
    },
    autolayouter: { value: null },
    debounceLibraryRefeshTimer: { value: null },
    displaySelectionGroup: {
      type: Boolean,
      value: true,
      notify: true,
      observer: 'displaySelectionGroupChanged',
    },
    editable: {
      type: Boolean,
      value: true,
    },
    graphChanges: {
      type: Array,
      value() {
        return [];
      },
    },
    errorNodes: {
      type: Object,
      value() {
        return {};
      },
      notify: true,
      observer: 'errorNodesChanged',
    },
    forceSelection: {
      type: Boolean,
      value: false,
      notify: true,
      observer: 'forceSelectionChanged',
    },
    graph: {
      value: null,
      notify: true,
      observer: 'graphChanged',
    },
    graphView: { value: null },
    grid: {
      type: Number,
      value: 72,
    },
    height: {
      type: Number,
      value: 600,
      notify: true,
      observer: 'heightChanged',
    },
    library: {
      value: null,
      notify: true,
    },
    maxZoom: {
      type: Number,
      value: 15,
      notify: true,
    },
    menus: {
      value: null,
      notify: true,
      observer: 'menusChanged',
    },
    minZoom: {
      type: Number,
      value: 0.15,
      notify: true,
    },
    offsetX: {
      value: 0,
      notify: true,
    },
    offsetY: {
      value: 0,
      notify: true,
    },
    pan: {
      notify: true,
      observer: 'panChanged',
    },
    readonly: {
      type: Boolean,
      value: false,
      notify: true,
      observer: 'readonlyChanged',
    },
    scale: {
      type: Number,
      value: 1,
      notify: true,
    },
    selectedEdges: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'selectedEdgesChanged',
    },
    selectedNodes: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'selectedNodesChanged',
    },
    selectedNodesHash: {
      type: Object,
      value() {
        return {};
      },
      observer: 'selectedNodesHashChanged',
    },
    snap: {
      type: Number,
      value: 36,
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
    this.library = {};
    // Default pan
    this.pan = [
      0,
      0,
    ];
    // Initializes the autolayouter
    this.autolayouter = klayNoflo.init({
      onSuccess: this.applyAutolayout.bind(this),
      workerScript: 'browser/vendor/klayjs/klay.js',
    });
    this.themeChanged();
  },

  themeChanged(newTheme, previousTheme) {
    PolymerDom(this.$.svgcontainer).classList.remove(`the-graph-${previousTheme}`);
    if (newTheme) {
      PolymerDom(this.$.svgcontainer).classList.add(`the-graph-${newTheme}`);
    }
  },

  graphEvents: [
    'changeProperties',
    'addNode',
    'changeNode',
    'removeNode',
    'addEdge',
    'changeEdge',
    'removeEdge',
    'addInitial',
    'removeInitial',
    'addGroup',
    'removeGroup',
    'changeGroup',
  ],

  graphRenameEvents: [
    'renameInport',
    'renameOutport',
    'renameGroup',
    'renameNode',
  ],

  graphPortEvents: [
    'addInport',
    'removeInport',
    'addOutport',
    'removeOutport',
  ],

  subscribeGraph(graph) {
    if (!this.trackGraphChange) {
      this.trackGraphChange = {};
    }
    this.graphEvents.forEach((event) => {
      this.trackGraphChange[event] = (payload) => {
        this.graphChanges.push({
          event,
          payload,
        });
        if (this.autolayout) {
          this.triggerAutolayout();
        }
      };
      graph.on(event, this.trackGraphChange[event]);
    });
    this.graphRenameEvents.forEach((event) => {
      this.trackGraphChange[event] = (from, to) => {
        this.graphChanges.push({
          event,
          payload: {
            from,
            to,
          },
        });
      };
      graph.on(event, this.trackGraphChange[event]);
    });
    this.graphPortEvents.forEach((event) => {
      this.trackGraphChange[event] = (pub, priv) => {
        this.graphChanges.push({
          event,
          payload: {
            public: pub,
            node: priv.process,
            port: priv.port,
            metadata: priv.metadata,
          },
        });
      };
      graph.on(event, this.trackGraphChange[event]);
    });

    // Send changeset at end of transaction
    this.trackGraphChange.endTransaction = () => {
      // Send full graph for storage
      this.fire('changed', graph);
      // Send and clear graph change log
      if (this.graphChanges.length) {
        if (!this.readonly) {
          this.fire('graphChanges', this.graphChanges);
        }
        this.graphChanges = [];
      }
    };
    this.graph.on('endTransaction', this.trackGraphChange.endTransaction);
  },

  unsubscribeGraph(graph) {
    if (!this.trackGraphChange) {
      return;
    }
    const allEvents = this.graphEvents.concat(this.graphRenameEvents, this.graphPortEvents);
    allEvents.forEach((event) => {
      if (!this.trackGraphChange[event]) {
        return;
      }
      graph.removeListener(event, this.trackGraphChange[event]);
      delete this.trackGraphChange[event];
    });

    if (this.trackGraphChange.endTransaction) {
      graph.removeListener('endTransaction', this.trackGraphChange.endTransaction);
      delete this.trackGraphChange.endTransaction;
    }
  },

  graphChanged(newGraph, oldGraph) {
    if (oldGraph && oldGraph.removeListener) {
      this.unsubscribeGraph(oldGraph);
    }

    if (this.appView) {
      // Remove previous instance
      ReactDOM.unmountComponentAtNode(this.$.svgcontainer);
    }

    if (!this.graph) {
      return;
    }

    // Subscribe to graph changes
    this.subscribeGraph(newGraph);

    // Setup app
    PolymerDom(this.$.svgcontainer).innerHTML = '';
    this.appView = ReactDOM.render(window.TheGraph.App({
      graph: this.graph,
      width: this.width,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      height: this.height,
      library: this.library,
      menus: this.menus,
      editable: this.editable,
      onEdgeSelection: this.onEdgeSelection.bind(this),
      onNodeSelection: this.onNodeSelection.bind(this),
      onPanScale: this.onPanScale.bind(this),
      getMenuDef: this.getMenuDef.bind(this),
      displaySelectionGroup: this.displaySelectionGroup,
      forceSelection: this.forceSelection,
      offsetY: this.offsetY,
      offsetX: this.offsetX,
      readonly: this.readonly,
    }), this.$.svgcontainer);
    this.graphView = this.appView.refs.graph;
  },

  onPanScale(x, y, scale) {
    this.set(`pan.${0}`, x);
    this.set(`pan.${1}`, y);
    this.scale = scale;
  },

  onEdgeSelection(itemKey, item, toggle) {
    if (itemKey === undefined) {
      if (this.selectedEdges.length > 0) {
        this.selectedEdges = [];
      }
      return;
    }
    if (toggle) {
      const index = this.selectedEdges.indexOf(item);
      const isSelected = index !== -1;
      const shallowClone = this.selectedEdges.slice();
      if (isSelected) {
        shallowClone.splice(index, 1);
        this.selectedEdges = shallowClone;
      } else {
        shallowClone.push(item);
        this.selectedEdges = shallowClone;
      }
    } else {
      this.selectedEdges = [item];
    }
  },

  onNodeSelection(itemKey, item, toggle) {
    if (itemKey === undefined) {
      if (this.selectedNodes.length > 0) {
        this.selectedNodes = [];
      }
    } else if (toggle) {
      const index = this.selectedNodes.indexOf(item);
      const isSelected = index !== -1;
      if (isSelected) {
        this.splice('selectedNodes', index, 1);
      } else {
        this.push('selectedNodes', item);
      }
    } else {
      this.selectedNodes = [item];
    }
  },

  selectedNodesChanged() {
    this.set('selectedNodesHash', {});
    const selectedNodesHash = {};
    for (let i = 0, len = this.selectedNodes.length; i < len; i += 1) {
      selectedNodesHash[this.selectedNodes[i].id] = true;
    }
    this.set('selectedNodesHash', selectedNodesHash);
    this.fire('nodes', this.selectedNodes);
  },

  selectedNodesHashChanged() {
    if (!this.graphView) {
      return;
    }
    this.graphView.setSelectedNodes(this.selectedNodesHash);
  },

  errorNodesChanged() {
    if (!this.graphView) {
      return;
    }
    this.graphView.setErrorNodes(this.errorNodes);
  },

  selectedEdgesChanged() {
    if (!this.graphView) {
      return;
    }
    this.graphView.setSelectedEdges(this.selectedEdges);
    this.fire('edges', this.selectedEdges);
  },

  animatedEdgesChanged() {
    if (!this.graphView) {
      return;
    }
    this.graphView.setAnimatedEdges(this.animatedEdges);
  },

  iconsChanged() {
    if (!this.graphView) {
      return;
    }
    Object.keys(this.icons).forEach((nodeId) => {
      this.graphView.updateIcon(nodeId, this.icons[nodeId]);
    });
  },

  triggerAutolayout() {
    const { graph } = this;
    const portInfo = this.graphView ? this.graphView.portInfo : null;
    // Calls the autolayouter
    this.autolayouter.layout({
      graph,
      portInfo,
      direction: 'RIGHT',
      options: {
        intCoordinates: true,
        algorithm: 'de.cau.cs.kieler.klay.layered',
        layoutHierarchy: true,
        spacing: 36,
        borderSpacing: 20,
        edgeSpacingFactor: 0.2,
        inLayerSpacingFactor: 2,
        nodePlace: 'BRANDES_KOEPF',
        nodeLayering: 'NETWORK_SIMPLEX',
        edgeRouting: 'POLYLINE',
        crossMin: 'LAYER_SWEEP',
        direction: 'RIGHT',
      },
    });
  },

  applyAutolayout(keilerGraph) {
    this.graph.startTransaction('autolayout');
    TheGraph.autolayout.applyToGraph(this.graph, keilerGraph, { snap: this.snap });
    this.graph.endTransaction('autolayout');
    // Fit to window
    this.triggerFit();
  },

  triggerFit() {
    if (this.appView) {
      this.appView.triggerFit();
    }
  },

  widthChanged() {
    if (!this.appView) {
      return;
    }
    this.appView.setState({ width: this.width });
  },

  heightChanged() {
    if (!this.appView) {
      return;
    }
    this.appView.setState({ height: this.height });
  },

  rerender(options) {
    // This is throttled with rAF internally
    if (!this.graphView) {
      return;
    }
    this.graphView.markDirty(options);
  },

  addNode(id, component, metadata) {
    if (!this.graph) {
      return;
    }
    this.graph.addNode(id, component, metadata);
  },

  getPan() {
    if (!this.appView) {
      return [
        0,
        0,
      ];
    }
    return [
      this.appView.state.x,
      this.appView.state.y,
    ];
  },

  panChanged() {
    // Send pan back to React
    if (!this.appView) {
      return;
    }
    this.appView.setState({
      x: this.pan[0],
      y: this.pan[1],
    });
  },

  getScale() {
    if (!this.appView) {
      return 1;
    }
    return this.appView.state.scale;
  },

  displaySelectionGroupChanged() {
    if (!this.graphView) {
      return;
    }
    this.graphView.setState({ displaySelectionGroup: this.displaySelectionGroup });
  },

  forceSelectionChanged() {
    if (!this.graphView) {
      return;
    }
    this.graphView.setState({ forceSelection: this.forceSelection });
  },

  focusNode(node) {
    this.appView.focusNode(node);
  },

  menusChanged() {
    // Only if the object itself changes,
    // otherwise builds menu from reference every time menu shown
    if (!this.appView) {
      return;
    }
    this.appView.setProps({ menus: this.menus });
  },

  readonlyChanged() {
    if (!this.appView) {
      return;
    }
    this.appView.setProps({ readonly: this.readonly });
  },

  debounceLibraryRefesh() {
    // Breaking the "no debounce" rule, this fixes #76 for subgraphs
    if (this.debounceLibraryRefeshTimer) {
      clearTimeout(this.debounceLibraryRefeshTimer);
    }
    this.debounceLibraryRefeshTimer = setTimeout(() => {
      this.rerender({ libraryDirty: true });
    }, 200);
  },

  registerComponent(definition, generated) {
    const component = this.library[definition.name];
    const def = definition;
    if (component && generated) {
      // Don't override real one with generated dummy
      return;
    }
    this.set(`library.${definition.name}`, def);
    // So changes are rendered
    this.debounceLibraryRefesh();
    // Register namespaced components also without their alias
    if (definition.name.indexOf('/') !== -1) {
      const unnamespaced = unnamespace(definition.name);
      this.registerComponent({
        ...definition,
        name: unnamespaced,
        unnamespaced: true,
      }, false);
    }
  },

  getComponent(name) {
    return this.library[name];
  },

  toJSON() {
    if (!this.graph) {
      return {};
    }
    return this.graph.toJSON();
  },

  hostAttributes: { 'touch-action': 'none' },
});
