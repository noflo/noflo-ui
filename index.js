

  // upgrade polymer-body last so that it can contain other imported elements
  document.addEventListener('polymer-ready', function() {
    
    Polymer('polymer-body', Platform.mixin({

      created: function() {
        this.template = document.createElement('template');
        var body = wrap(document).body;
        var c$ = body.childNodes.array();
        for (var i=0, c; (c=c$[i]); i++) {
          if (c.localName !== 'script') {
            this.template.content.appendChild(c);
          }
        }
        // snarf up user defined model
        window.model = this;
      },

      parseDeclaration: function(elementElement) {
        this.lightFromTemplate(this.template);
      }

    }, window.model));

  });

  ;

  (function(){
    "use strict";

    Polymer('the-graph', {
      graph: null,
      library: null,
      menus: null,
      width: 800,
      height: 600,
      scale: 1,
      appView: null,
      graphView: null,
      editable: true,
      autolayout: false,
      grid: 72,
      snap: 36,
      theme: "dark",
      selectedNodes: [],
      selectedEdges: [],
      animatedEdges: [],
      autolayouter: null,
      created: function () {
        this.library = {};
        // Default pan
        this.pan = [0,0];
        // Initializes the autolayouter
        this.autolayouter = klay.init({
          onSuccess: this.applyAutolayout.bind(this),
          workerScript: "../bower_components/klay-js/klay-worker.js"
        });
      },
      ready: function () {
        this.themeChanged();
      },
      themeChanged: function () {
        this.$.svgcontainer.className = "the-graph-"+this.theme;
      },
      graphChanged: function (oldGraph, newGraph) {
        if (oldGraph && oldGraph.removeListener) {
          oldGraph.removeListener("endTransaction", this.fireChanged);
        }
        // Listen for graph changes
        this.graph.on("endTransaction", this.fireChanged.bind(this));

        // Listen for autolayout changes
        if (this.autolayout) {
          this.graph.on('addNode', this.triggerAutolayout.bind(this));
          this.graph.on('removeNode', this.triggerAutolayout.bind(this));
          this.graph.on('addInport', this.triggerAutolayout.bind(this));
          this.graph.on('removeInport', this.triggerAutolayout.bind(this));
          this.graph.on('addOutport', this.triggerAutolayout.bind(this));
          this.graph.on('removeOutport', this.triggerAutolayout.bind(this));
          this.graph.on('addEdge', this.triggerAutolayout.bind(this));
          this.graph.on('removeEdge', this.triggerAutolayout.bind(this));
        }

        if (this.appView) {
          // Remove previous instance
          React.unmountComponentAtNode(this.$.svgcontainer);
        }

        // Setup app
        this.$.svgcontainer.innerHTML = "";
        this.appView = React.renderComponent(
          window.TheGraph.App({
            graph: this.graph,
            width: this.width,
            height: this.height,
            library: this.library,
            menus: this.menus,
            editable: this.editable,
            onEdgeSelection: this.onEdgeSelection.bind(this),
            onNodeSelection: this.onNodeSelection.bind(this),
            onPanScale: this.onPanScale.bind(this),
            getMenuDef: this.getMenuDef
          }),
          this.$.svgcontainer
        );
        this.graphView = this.appView.refs.graph;
      },
      onPanScale: function (x, y, scale) {
        this.pan[0] = x;
        this.pan[1] = y;
        this.scale = scale;
      },
      onEdgeSelection: function (itemKey, item, toggle) {
        if (itemKey === undefined) {
          if (this.selectedEdges.length>0) {
            this.selectedEdges = [];
          }
          this.fire('edges', this.selectedEdges);
          return;
        }
        if (toggle) {
          var index = this.selectedEdges.indexOf(item);
          var isSelected = (index !== -1);
          var shallowClone = this.selectedEdges.slice();
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
        this.fire('edges', this.selectedEdges);
      },
      onNodeSelection: function (itemKey, item, toggle) {
        if (itemKey === undefined) {
          if (this.selectedNodes.length>0) {
            this.selectedNodes = [];
          }
          this.fire('nodes', this.selectedNodes);
          return;
        }
        if (toggle) {
          var index = this.selectedNodes.indexOf(item);
          var isSelected = (index !== -1);
          var shallowClone = this.selectedNodes.slice();
          if (isSelected) {
            shallowClone.splice(index, 1);
            this.selectedNodes = shallowClone;
          } else {
            shallowClone.push(item);
            this.selectedNodes = shallowClone;
          }
        } else {
          this.selectedNodes = [item];
        }
        this.fire('nodes', this.selectedNodes);
      },
      selectedNodesChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setSelectedNodes(this.selectedNodes);
      },
      selectedEdgesChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setSelectedEdges(this.selectedEdges);
      },
      animatedEdgesChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setAnimatedEdges(this.animatedEdges);
      },
      fireChanged: function (event) {
        this.fire("changed", this);
      },
      autolayoutChanged: function () {
        if (!this.graph) { return; }
        // Only listen to changes that affect layout
        if (this.autolayout) {
          this.graph.on('addNode', this.triggerAutolayout.bind(this));
          this.graph.on('removeNode', this.triggerAutolayout.bind(this));
          this.graph.on('addInport', this.triggerAutolayout.bind(this));
          this.graph.on('removeInport', this.triggerAutolayout.bind(this));
          this.graph.on('addOutport', this.triggerAutolayout.bind(this));
          this.graph.on('removeOutport', this.triggerAutolayout.bind(this));
          this.graph.on('addEdge', this.triggerAutolayout.bind(this));
          this.graph.on('removeEdge', this.triggerAutolayout.bind(this));
        } else {
          this.graph.removeListener('addNode', this.triggerAutolayout);
          this.graph.removeListener('removeNode', this.triggerAutolayout);
          this.graph.removeListener('addInport', this.triggerAutolayout);
          this.graph.removeListener('removeInport', this.triggerAutolayout);
          this.graph.removeListener('addOutport', this.triggerAutolayout);
          this.graph.removeListener('removeOutport', this.triggerAutolayout);
          this.graph.removeListener('addEdge', this.triggerAutolayout);
          this.graph.removeListener('removeEdge', this.triggerAutolayout);
        }
      },
      triggerAutolayout: function (event) {
        var graph = this.graph;
        var portInfo = this.graphView ? this.graphView.portInfo : null;
        // Calls the autolayouter
        this.autolayouter.layout({
          "graph": graph,
          "portInfo": portInfo,
          "direction": "RIGHT"
        });
      },
      applyAutolayout: function (layoutedKGraph) {
        this.graph.startTransaction("autolayout");

        // Update original graph nodes with the new coordinates from KIELER graph
        var children = layoutedKGraph.children.slice();

        var i, len;
        for (i=0, len = children.length; i<len; i++) {
          var klayNode = children[i];
          var nofloNode = this.graph.getNode(klayNode.id);

          // Encode nodes inside groups
          if (klayNode.children) {
            var klayChildren = klayNode.children;
            var idx;
            for (idx in klayChildren) {
              var klayChild = klayChildren[idx];
              if (klayChild.id) {
                this.graph.setNodeMetadata(klayChild.id, {
                  x: Math.round((klayNode.x + klayChild.x)/this.snap)*this.snap,
                  y: Math.round((klayNode.y + klayChild.y)/this.snap)*this.snap
                });
              }
            }
          }

          // Encode nodes outside groups
          if (nofloNode) {
            this.graph.setNodeMetadata(klayNode.id, {
              x: Math.round(klayNode.x/this.snap)*this.snap,
              y: Math.round(klayNode.y/this.snap)*this.snap
            });
          } else {
            // Find inport or outport
            var idSplit = klayNode.id.split(":::");
            var expDirection = idSplit[0];
            var expKey = idSplit[1];
            if (expDirection==="inport" && this.graph.inports[expKey]) {
              this.graph.setInportMetadata(expKey, {
                x: Math.round(klayNode.x/this.snap)*this.snap,
                y: Math.round(klayNode.y/this.snap)*this.snap
              });
            } else if (expDirection==="outport" && this.graph.outports[expKey]) {
              this.graph.setOutportMetadata(expKey, {
                x: Math.round(klayNode.x/this.snap)*this.snap,
                y: Math.round(klayNode.y/this.snap)*this.snap
              });
            }
          }
        }
  
        this.graph.endTransaction("autolayout");

        // Fit to window
        this.triggerFit();

      },
      triggerFit: function () {
        if (this.appView) {
          this.appView.triggerFit();
        }
      },
      widthChanged: function () {
        if (!this.appView) { return; }
        this.appView.setState({
          width: this.width
        });
      },
      heightChanged: function () {
        if (!this.appView) { return; }
        this.appView.setState({
          height: this.height
        });
      },
      updateIcon: function (nodeId, icon) {
        if (!this.graphView) { return; }
        this.graphView.updateIcon(nodeId, icon);
      },
      rerender: function (options) {
        // This is throttled with rAF internally
        if (!this.graphView) { return; }
        this.graphView.markDirty(options);
      },
      addNode: function (id, component, metadata) {
        if (!this.graph) { return; }
        this.graph.addNode(id, component, metadata);
      },
      getPan: function () {
        if (!this.appView) { 
          return [0, 0]; 
        }
        return [this.appView.state.x, this.appView.state.y];
      },
      panChanged: function () {
        // Send pan back to React
        if (!this.appView) { return; }
        this.appView.setState({
          x: this.pan[0],
          y: this.pan[1]
        });
      },
      getScale: function () {
        if (!this.appView) { 
          return 1; 
        }
        return this.appView.state.scale;
      },
      menusChanged: function () {
        // Only if the object itself changes, 
        // otherwise builds menu from reference every time menu shown
        if (!this.appView) { return; }
        this.appView.setProps({menus: this.menus});
      },
      debounceLibraryRefeshTimer: null,
      debounceLibraryRefesh: function () {
        // Breaking the "no debounce" rule, this fixes #76 for subgraphs
        if (this.debounceLibraryRefeshTimer) {
          clearTimeout(this.debounceLibraryRefeshTimer);
        }
        this.debounceLibraryRefeshTimer = setTimeout(function () {
          this.rerender({libraryDirty:true});
        }.bind(this), 200);
      },
      registerComponent: function (definition, generated) {
        if (!this.library[definition.name]) {
          // New component, register
          this.library[definition.name] = definition;
          // So changes are rendered
          this.debounceLibraryRefesh();
          return;
        }
        // Update existing
        var component = this.library[definition.name];
        if (definition.description) {
          component.description = definition.description;
        }
        if (definition.icon && definition.icon!=="cog") {
          component.icon = definition.icon;
        }
        var defInPorts = [];
        var defOutPorts = [];
        definition.inports.forEach(function (defPort) {
          var port = null;
          defInPorts.push(defPort.name);
          component.inports.forEach(function (p) {
            if (p.name === defPort.name) {
              port = p;
            }
          });
          if (port) {
            port.type = defPort.type;
            return;
          }
          component.inports.push({
            name: defPort.name,
            type: defPort.type,
            array: defPort.array
          });
        });
        definition.outports.forEach(function (defPort) {
          var port = null;
          defOutPorts.push(defPort.name);
          component.outports.forEach(function (p) {
            if (p.name === defPort.name) {
              port = p;
            }
          });
          if (port) {
            port.type = defPort.type;
            return;
          }
          component.outports.push({
            name: defPort.name,
            type: defPort.type,
            array: defPort.array
          });
        });

        if (generated) {
          // So changes are rendered
          this.debounceLibraryRefesh();
          return;
        }
        component.inports.forEach(function (p, idx) {
          if (defInPorts.indexOf(p.name) === -1) {
            component.inports.splice(idx, 1);
          }
        });
        component.outports.forEach(function (p, idx) {
          if (defOutPorts.indexOf(p.name) === -1) {
            component.outports.splice(idx, 1);
          }
        });

        // So changes are rendered
        this.debounceLibraryRefesh();
      },
      getComponent: function (name) {
        return this.library[name];
      },
      toJSON: function () {
        if (!this.graph) { return {}; }
        return this.graph.toJSON();
      }
    });

  })();
  ;

  (function () {
    "use strict";

    Polymer('the-graph-editor', {
      graph: null,
      grid: 72,
      snap: 36,
      width: 800,
      height: 600,
      scale: 1,
      plugins: {},
      nofloGraph: null,
      menus: null,
      autolayout: false,
      theme: "dark",
      selectedNodes: [],
      selectedEdges: [],
      animatedEdges: [],
      created: function () {
        // Default pan
        this.pan = [0,0];
        // Default context menu defs
        this.menus = {
          edge: {
            icon: "long-arrow-right",
            s4: {
              icon: "trash-o",
              iconLabel: "delete",
              action: function (graph, itemKey, item) {
                graph.removeEdge( item.from.node, item.from.port, item.to.node, item.to.port );
              }
            }
          },
          node: {
            s4: {
              icon: "trash-o",
              iconLabel: "delete",
              action: function (graph, itemKey, item) {
                graph.removeNode( itemKey );
              }
            }
          },
          nodeInport: {
            w4: {
              icon: "sign-in",
              iconLabel: "export",
              action: function (graph, itemKey, item) {
                var pub = item.port;
                if (pub === 'start') {
                  pub = 'start1';
                }
                if (pub === 'graph') {
                  pub = 'graph1';
                }
                var count = 0;
                // Make sure public is unique
                while (graph.inports[pub]) {
                  count++;
                  pub = item.port + count;
                }
                var priNode = graph.getNode(item.node);
                var metadata = {x:priNode.metadata.x-144, y:priNode.metadata.y};
                graph.addInport(pub, item.node, item.port, metadata);
              }
            }
          },
          nodeOutport: {
            e4: {
              icon: "sign-out",
              iconLabel: "export",
              action: function (graph, itemKey, item) {
                var pub = item.port;
                var count = 0;
                // Make sure public is unique
                while (graph.outports[pub]) {
                  count++;
                  pub = item.port + count;
                } 
                var priNode = graph.getNode(item.node);
                var metadata = {x:priNode.metadata.x+144, y:priNode.metadata.y};
                graph.addOutport(pub, item.node, item.port, metadata);
              }
            }
          },
          graphInport: {
            icon: "sign-in",
            iconColor: 2,
            n4: {
              label: "inport"
            },
            s4: {
              icon: "trash-o",
              iconLabel: "delete",
              action: function (graph, itemKey, item) {
                graph.removeInport(itemKey);
              }
            }
          },
          graphOutport: {
            icon: "sign-out",
            iconColor: 5,
            n4: {
              label: "outport"
            },
            s4: {
              icon: "trash-o",
              iconLabel: "delete",
              action: function (graph, itemKey, item) {
                graph.removeOutport(itemKey);
              }
            }
          },
          group: {
            icon: "th",
            s4: {
              icon: "trash-o",
              iconLabel: "ungroup",
              action: function (graph, itemKey, item) {
                graph.removeGroup(itemKey);
              }
            }
          },
          selection: {
            icon: "th"
          }
        };
      },
      ready: function () {},
      attached: function () {
      },
      detached: function () {
        for (var name in this.plugins) {
          this.plugins[name].unregister(this);
          delete this.plugins[name];
        }
      },
      addPlugin: function (name, plugin) {
        this.plugins[name] = plugin;
        plugin.register(this);
      },
      addMenu: function (type, options) {
        // options: icon, label
        this.menus[type] = options;
      },
      addMenuCallback: function (type, callback) {
        if (!this.menus[type]) {
          return;
        }
        this.menus[type].callback = callback;
      },
      addMenuAction: function (type, direction, options) {
        if (!this.menus[type]) {
          this.menus[type] = {};
        }
        var menu = this.menus[type];
        menu[direction] = options;
      },
      getMenuDef: function (options) {
        // Options: type, graph, itemKey, item
        if (options.type && this.menus[options.type]) {
          var defaultMenu = this.menus[options.type];
          if (defaultMenu.callback) {
            return defaultMenu.callback(defaultMenu, options);
          }
          return defaultMenu;
        }
        return null;
      },
      widthChanged: function () {
        this.style.width = this.width + "px";
      },
      heightChanged: function () {
        this.style.height = this.height + "px";
      },
      graphChanged: function () {
        if (typeof this.graph.addNode === 'function') {
          this.buildInitialLibrary(this.graph);
          this.nofloGraph = this.graph;
          return;
        }
        require('noflo').graph.loadJSON(this.graph, function(nofloGraph){
          this.buildInitialLibrary(nofloGraph);
          this.nofloGraph = nofloGraph;
        }.bind(this));
      },
      buildInitialLibrary: function (nofloGraph) {
        /*if (Object.keys(this.$.graph.library).length !== 0) {
          // We already have a library, skip
          // TODO what about loading a new graph? Are we making a new editor?
          return;
        }*/

        nofloGraph.nodes.forEach(function (node) {
          var component = {
            name: node.component,
            icon: 'cog',
            description: '',
            inports: [],
            outports: []
          };

          Object.keys(nofloGraph.inports).forEach(function (pub) {
            var exported = nofloGraph.inports[pub];
            if (exported.process === node.id) {
              for (var i = 0; i < component.inports.length; i++) {
                if (component.inports[i].name === exported.port) {
                  return;
                }
              }
              component.inports.push({
                name: exported.port,
                type: 'all'
              });
            }
          });
          Object.keys(nofloGraph.outports).forEach(function (pub) {
            var exported = nofloGraph.outports[pub];
            if (exported.process === node.id) {
              for (var i = 0; i < component.outports.length; i++) {
                if (component.outports[i].name === exported.port) {
                  return;
                }
              }
              component.outports.push({
                name: exported.port,
                type: 'all'
              });
            }
          });
          nofloGraph.initializers.forEach(function (iip) {
            if (iip.to.node === node.id) {
              for (var i = 0; i < component.inports.length; i++) {
                if (component.inports[i].name === iip.to.port) {
                  return;
                }
              }
              component.inports.push({
                name: iip.to.port,
                type: 'all'
              });
            }
          });

          nofloGraph.edges.forEach(function (edge) {
            var i;
            if (edge.from.node === node.id) {
              for (i = 0; i < component.outports.length; i++) {
                if (component.outports[i].name === edge.from.port) {
                  return;
                }
              }
              component.outports.push({
                name: edge.from.port,
                type: 'all'
              });
            }
            if (edge.to.node === node.id) {
              for (i = 0; i < component.inports.length; i++) {
                if (component.inports[i].name === edge.to.port) {
                  return;
                }
              }
              component.inports.push({
                name: edge.to.port,
                type: 'all'
              });
            }
          });
          this.registerComponent(component, true);
        }.bind(this));
      },
      registerComponent: function (definition, generated) {
        this.$.graph.registerComponent(definition, generated);
      },
      updateIcon: function (nodeId, icon) {
        this.$.graph.updateIcon(nodeId, icon);
      },
      rerender: function () {
        this.$.graph.rerender();
      },
      triggerAutolayout: function () {
        this.$.graph.triggerAutolayout();
      },
      triggerFit: function () {
        this.$.graph.triggerFit();
      },
      animateEdge: function (edge) {
        // Make sure unique
        var index = this.animatedEdges.indexOf(edge);
        if (index === -1) {
          this.animatedEdges.push(edge);
        }
      },
      unanimateEdge: function (edge) {
        var index = this.animatedEdges.indexOf(edge);
        if (index >= 0) {
          this.animatedEdges.splice(index, 1);
        }
      },
      getComponent: function (name) {
        return this.$.graph.getComponent(name);
      },
      getLibrary: function () {
        return this.$.graph.library;
      },
      toJSON: function () {
        return this.nofloGraph.toJSON();
      }
    });

  })();
  ;

    Polymer('noflo-polymer', {
    });
  ;

    Polymer('number-scrubber', {
      value: undefined,
      startValue: 0,
      min: -Infinity,
      max: Infinity,
      mod: 0,
      step: 1,
      distance: 5,
      precision: 1000000,
      onTrackStart: function (event) {
        if (this.value === undefined)
          return;
        this.value = parseFloat(this.value);
        this.startValue = this.value;
        document.body.style.cursor = "ew-resize";
      },
      onTrack: function (event) {
        if (this.value === undefined)
          return;
        var lastValue = this.value;

        var delta = event.dx;

        if (this.distance > 1) {
          delta = Math.round( delta / this.distance );
        }
        if (this.step !== 1) {
          if (this.step > 1) {
            delta = Math.round( delta / this.step ) * this.step;
          } else if (this.step > 0) {
            delta *= this.step;
          }
        }

        var newValue = this.startValue + delta;

        if (this.mod !== 0) {
          newValue %= this.mod;
        }
        if (isFinite(this.min)) {
          newValue = Math.max(newValue, this.min);
        }
        if (isFinite(this.max)) {
          newValue = Math.min(newValue, this.max);
        }

        // Stupid JS numbers
        if (this.precision > 1) {
          newValue = Math.round( newValue * this.precision ) / this.precision;
        }

        if (this.value !== newValue) {
          this.value = newValue;
          this.fire("changed", this.value);
        }
      },
      onTrackEnd: function (event) {
        if (this.value === undefined)
          return;
        document.body.style.cursor = "auto";
      }
    });
  ;

    Polymer('noflo-node-inspector', {
      label: '',
      node: null,
      component: null,
      graph: null,
      inports: [],
      enteredView: function () {
        this.updatePorts();
        this.label = this.node.metadata.label;
      },
      updateLabel: function (event, detail, sender) {
        this.graph.setNodeMetadata(this.node.id, {
          label: sender.innerText
        });
      },
      getPortValue: function (port) {
        var value;
        this.graph.initializers.forEach(function (iip) {
          if (iip.to.node == this.node.id && iip.to.port === port) {
            value = iip.from.data;
          }
        }.bind(this));
        return value;
      },
      getPortConnection: function (port) {
        var connected = false;
        var route = "X";
        Object.keys(this.graph.inports).forEach(function (name) {
          var inport = this.graph.inports[name];
          if (inport.process == this.node.id && inport.port == port) {
            connected = true;
            route = 2;
          }
        }.bind(this));
        this.graph.edges.forEach(function (edge) {
          if (edge.to.node == this.node.id && edge.to.port == port) {
            connected = true;
            route = edge.metadata.route || 0;
          }
        }.bind(this));
        return {
          connected: connected,
          route: route
        };
      },
      portToInput: function (port) {
        var value = this.getPortValue(port.name);
        var connection = this.getPortConnection(port.name);
        var portDef = {
          name: port.name,
          label: port.name.replace(/(.*)\/(.*)(_.*)\.(.*)/, '$2.$4'),
          class: '',
          type: port.type,
          description: port.description,
          inputType: port.type,
          value: value,
          route: connection.route
        };
        switch (port.type) {
          case 'object':
          case 'array':
            portDef.value = JSON.stringify(value);
            portDef.inputType = 'text';
            break;
          case 'int':
            portDef.inputType = 'number';
            break;
          case 'all':
            portDef.inputType = 'text';
            break;
        }
        return portDef;
      },
      inputToPort: function (input) {
        var dataType = input.getAttribute('data-type');
        switch (dataType) {
          case 'object':
          case 'array':
            try {
              return JSON.parse(input.value);
            } catch (e) {
              return input.value;
            }
            break;
          case 'boolean':
            return input.checked;
          case 'number':
            return parseFloat(input.value);
          case 'int':
            return parseInt(input.value, 10);
          case 'date':
            return new Date(input.value);
          default:
            return input.value;
        }
      },
      updatePorts: function () {
        this.inports = [];
        this.component.inports.forEach(function (port) {
          var portDef = this.portToInput(port);
          this.inports.push(portDef);
        }.bind(this));
      },
      checkEnter: function (event, detail, sender) {
        if (event.keyCode===13) {
          event.preventDefault();
          this.updateValue(event, detail, sender);
        }
      },
      updateValue: function (event, detail, sender) {
        event.preventDefault();

        var value = this.inputToPort(sender);
        var name = sender.getAttribute('name');
        var port;
        this.inports.forEach(function (p) {
          if (p.name === name) {
            port = p;
          }
        });

        if (port.type!=='string' && (sender.value==="" || !sender.value)) {
          // Empty string should remove number, object, array IIPs
          this.removeValue(event, detail, sender);
          return;
        }

        var validatePortValue = function(type, value) {
          switch (type) {
            case 'number':
            case 'int':
              return (value!=="" && !isNaN(value));
            case 'object':
              return value instanceof Object;
            case 'array':
              return value instanceof Array;
            case 'date':
              return value instanceof Date;
          }
          return true;
        };

        if (validatePortValue(port.type, value)) {
          this.graph.startTransaction('iipchange');
          this.graph.removeInitial(this.node.id, name);
          this.graph.addInitial(value, this.node.id, name);
          this.graph.endTransaction('iipchange');
          sender.parentNode.parentNode.classList.remove('error');
        } else {
          sender.parentNode.parentNode.classList.add('error');
        }
      },
      removeValue: function (event, detail, sender) {
        event.preventDefault();
        var name = sender.getAttribute('data-port');
        if (!name) {
          name = sender.getAttribute('name');
        }
        this.graph.removeInitial(this.node.id, name);
        this.inports.forEach(function (port) {
          if (port.name === name) {
            port.value = null;
          }
        });
        sender.parentNode.parentNode.classList.remove('error');
      },
      sendBang: function (event, detail, sender) {
        event.preventDefault();
        var name = sender.getAttribute('name');
        this.graph.startTransaction('bang');
        this.graph.removeInitial(this.node.id, name);
        this.graph.addInitial(true, this.node.id, name);
        this.graph.removeInitial(this.node.id, name);
        this.graph.endTransaction('bang');
      }
    });
  ;

    Polymer('noflo-exported-inspector', {
      name: '',
      direction: 'input',
      publicport: '',
      privateport: null,
      graph: null,
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
        this.name =  this.publicport;
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      nameChanged: function () {
        if (!this.name) {
          this.canSend = false;
          return;
        }
        if (this.direction === 'input' && (this.name === 'start' || this.name === 'graph')) {
          // Reserved port names
          this.canSend = false;
          return;
        }
        this.canSend = true;
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name) {
          return;
        }
        if (this.direction === 'input') {
          if (this.name === 'start' || this.name === 'graph') {
            return;
          }
          this.graph.renameInport(this.publicport, this.name);
        } else {
          this.graph.renameOutport(this.publicport, this.name);
        }
        this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-type-selector', {
      type: 'noflo-nodejs',
      available: [],
      runtimes: [],
      runtimesChanged: function () {
        this.available = [
          {
            id: 'all',
            label: 'Multi-platform',
            icon: 'asterisk',
            runtimes: []
          }
        ];
        this.runtimes.forEach(function (rt) {
          var availType = this.getByType(rt.type);
          availType.runtimes.push(rt);
        }.bind(this));
      },
      selectType: function (event, details, sender) {
        this.type = sender.getAttribute('data-id');
      },
      getByType: function (type) {
        for (var i = 0; i < this.available.length; i++) {
          if (this.available[i].id === type) {
            return this.available[i];
          }
        }
        return this.prepareAvailable(type);
      },
      prepareAvailable: function (type) {
        var label;
        var icon;
        switch (type) {
          case 'noflo-browser':
            label = 'Browser';
            icon = 'html5';
            break;
          case 'noflo-nodejs':
            label = 'Node.js';
            icon = 'cloud';
            break;
          case 'noflo-gnome':
            label = 'GNOME';
            icon = 'desktop';
            break;
          case 'microflo':
            label = 'Microcontroller';
            icon = 'lightbulb-o';
            break;
          case 'imgflo':
            label = 'Image Manipulation';
            icon = 'picture-o';
            break;
          default:
            label = type;
            icon = 'cogs';
        }
        var availType = {
          id: type,
          label: label,
          icon: icon,
          runtimes: []
        };
        this.available.push(availType);
        return availType;
      }
    });
  ;

    Polymer('noflo-new-graph', {
      name: '',
      project: '',
      runtimes: [],
      type: 'noflo-browser',
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      nameChanged: function () {
        if (this.name && this.project) {
          this.canSend = true;
        } else {
          this.canSend = false;
        }
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'newGraph');
        }
        var noflo = require('noflo');
        var graph = new noflo.Graph(this.name);
        graph.setProperties({
          id: graph.name.replace(' ', '_'),
          project: this.project,
          environment: {
            type: this.type
          }
        });
        this.fire('new', graph);
        this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-group-inspector', {
      name: '',
      description: '',
      graph: null,
      nodes: [],
      group: '',
      groupdescription: '',
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
        this.name =  this.group;
        this.description =  this.groupdescription;
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name) {
          return;
        }
        if (this.group) {
          if (this.name !== this.group) {
            this.graph.renameGroup(this.group, this.name);
          }
          if (this.description !== this.groupdescription) {
            this.graph.setGroupMetadata(this.group, {
              description: this.description
            });
          }
        } else {
        this.graph.addGroup(this.name, this.nodes, {
          description: this.description
        });
        }
        this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('the-card-stack', {
      enteredView: function () {
        this.observeChanges();
      },
      leftView: function () {
        if (this.observer) {
          this.observer.disconnect();
        }
      },
      observeChanges: function () {
        this.observer = new MutationObserver(this.updateVisibility.bind(this));
        this.observer.observe(this, {
          subtree: false,
          childList: true,
          attributes: false,
          characterData: false
        });
      },
      updateVisibility: function () {
        if (this.childElementCount === 0) {
          this.parentNode.removeChild(this);
        }
      }
    });
  ;

    Polymer('the-card', {
      enteredView: function () {
        this.fire('show', this);
      },
      leftView: function () {
        this.fire('hide', this);
      },
      addTo: function (parent, prepend) {
        var stacks = parent.getElementsByTagName('the-card-stack');
        for (var i = 0; i < stacks.length; i++) {
          if (stacks[i].type === this.type) {
            stacks[i].appendChild(this);
            return;
          }
        }

        var stack = document.createElement('the-card-stack');
        stack.type = this.type;
        stack.appendChild(this);

        if (prepend && parent.childElementCount > 0) {
          parent.insertBefore(stack, parent.firstChild);
          return;
        }
        parent.appendChild(stack);
      }
    });
  ;

    Polymer('the-panel', {
      edge: 'left',
      size: 200,
      handle: 0,
      automatic: true,
      open: false,
      toggleOpen: function (open) {
        this.open = open;
        this.updateVisibility();
      },
      enteredView: function () {
        this.cleanUpLocation();
        this.automaticChanged();
        this.updateVisibility();
        this.addEventListener('click', this.handleClicked.bind(this), false);
      },
      leftView: function () {
        this.unobserve();
      },
      edgeChanged: function () {
        this.updateVisibility();
      },
      sizeChanged: function () {
        this.updateVisibility();
      },
      handleChanged: function () {
        this.updateVisibility();
      },
      openChanged: function () {
        this.updateVisibility();
      },
      automaticChanged: function () {
        if (this.automatic) {
          this.observeChanges();
        } else {
          this.unobserve();
        }
      },
      getHeader: function () {
        return this.querySelector('header');
      },
      getMain: function () {
        return this.querySelector('main');
      },
      getFooter: function () {
        return this.querySelector('footer');
      },
      handleClicked: function (event) {
        if (this.automatic) {
          return;
        }
        if (event.target !== this) {
          return;
        }
        if (this.open) {
          this.open = false;
          return;
        }
        this.open = true;
      },
      observeChanges: function () {
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.observer.observe(this.getMain(), {
          subtree: false,
          childList: true,
          attributes: false,
          characterData: false
        });
      },
      unobserve: function () {
        if (!this.observer) {
          return;
        }
        this.observer.disconnect();
        this.observer = null;
      },
      handleMutations: function () {
        if (this.getMain().childElementCount === 0) {
          this.open = false;
        } else {
          this.open = true;
        }
      },
      getPositionDimension: function () {
        return this.edge;
      },
      getSizeDimensions: function () {
        switch (this.edge) {
          case 'left':
          case 'right':
            return ['width', 'height'];
          case 'top':
          case 'bottom':
            return ['height', 'width'];
        }
      },
      cleanUpLocation: function () {
        this.style.left = '';
        this.style.right = '';
        this.style.top = '';
        this.style.bottom = '';
      },
      updateVisibility: function () {
        var sizeDimensions = this.getSizeDimensions();
        this.style[sizeDimensions[1]] = '100%';
        this.style[sizeDimensions[0]] = this.size + 'px';
        var outside = 0;
        if (!this.open) {
          outside = (this.size - this.handle) * -1;
        }
        this.style[this.getPositionDimension()] = outside + 'px';
      }
    });
  ;

    Polymer('noflo-context', {
      project: null,
      search: null,
      editor: null,
      runtime: null,
      graphs: [],
      nodes: [],
      edges: [],
      runtimes: [],
      component: '',
      help: null,
      enteredView: function () {
        this.contextBar = this.$.context;
        window.addEventListener('keyup', function (e) {
          if (e.keyCode === 27) {
            this.clearSelection();
          }
        }.bind(this));

        // Workaround for https://github.com/Polymer/PointerEvents/issues/134
        document.addEventListener('touchstart', function () {});

        this.help = document.querySelector('noflo-help');
      },
      clearSelection: function () {
        var edge, node;
        // Clear selections on Esc
        while (this.edges.length) {
          edge = this.edges.pop();
          edge.selected = false;
        }
        while (this.nodes.length) {
          node = this.nodes.pop();
          node.selected = false;
        }
      },
      getpanel: function () {
        this.fire('toolpanel', this.$.fixed);
        this.fire('contextpanel', this.$.context);
      },
      editorChanged: function () {
        if (!this.editor) {
          return;
        }
        this.editor.addMenuAction('graphInport', 'n4', {
          icon: 'pencil-square-o',
          iconLabel: 'rename',
          action: function (graph, itemKey, item) {
            var dialog = document.createElement('noflo-exported-inspector');
            dialog.graph = this.graphs[this.graphs.length - 1];
            dialog.publicport = itemKey;
            dialog.privateport = item;
            dialog.direction = 'input';
            document.body.appendChild(dialog);
          }.bind(this)
        });
        this.editor.addMenuAction('graphOutport', 'n4', {
          icon: 'pencil-square-o',
          iconLabel: 'rename',
          action: function (graph, itemKey, item) {
            var dialog = document.createElement('noflo-exported-inspector');
            dialog.graph = this.graphs[this.graphs.length - 1];
            dialog.publicport = itemKey;
            dialog.privateport = item;
            dialog.direction = 'output';
            document.body.appendChild(dialog);
          }.bind(this)
        });
        this.editor.addMenuAction('selection', 'e4', {
          icon: 'sitemap',
          iconLabel: 'graph',
          action: this.subgraph.bind(this)
        });
        this.editor.addMenuAction('selection', 'w4', {
          icon: 'square-o',
          iconLabel: 'group',
          action: this.group.bind(this)
        });
        this.editor.addMenuCallback('node', function (defaultMenu, options) {
          if (!options.item.component) {
            return defaultMenu;
          }
          if (!this.canGetSource(options.item.component)) {
            return defaultMenu;
          }
          var i, menuKey;
          var localMenu = {};
          var openAction =  {
            icon: 'arrow-circle-o-up',
            iconLabel: 'open',
            action: function (graph, itemKey, item) {
              if (typeof ga === 'function') {
                ga('send', 'event', 'menu', 'click', 'openNode');
              }
              window.location.hash += '/' + encodeURIComponent(item.id);
            }
          };
          for (menuKey in defaultMenu) {
            localMenu[menuKey] = defaultMenu[menuKey];
          }
          localMenu.n4 = openAction;
          return localMenu;
        }.bind(this));
      },
      projectChanged: function () {
        this.fire('project', this.project);
      },
      graphsChanged: function () {
        this.fire('graphs', this.graphs);
        if (this.graphs.length) {
          var graph = this.graphs[this.graphs.length - 1];
          if (graph.nodes.length === 0 && this.graphs.length === 1) {
            // Empty main graph, we should show the help text
            this.showHelp(graph);
          }

          if (!graph.properties.project) {
            window.setTimeout(function () {
              this.fire('example', graph);
              if (typeof ga === 'function') {
                ga('send', 'event', 'url', 'navigation', 'openExample');
              }
            }.bind(this), 1);
          } else {
            if (typeof ga === 'function') {
              ga('send', 'event', 'url', 'navigation', 'openGraph');
            }
          }
          this.fire('currentgraph', graph);
          this.setHelp();
        }
        this.search = null;
      },
      nodesChanged: function () {
        this.fire('nodes', this.nodes);
        if (this.nodes.length) {
          this.showNodeCards();
        } else {
          this.hideNodeCards();
        }
      },
      nodeInspectors: {},
      showNodeCards: function () {
        this.nodes.forEach(function (node) {
          var id = node.id;
          if (this.nodeInspectors[id]) {
            return;
          }
          var inspector = document.createElement('noflo-node-inspector');
          inspector.node = node;
          inspector.component = this.editor.getComponent(node.component);
          inspector.graph = this.graphs[this.graphs.length - 1];
          this.nodeInspectors[id] = document.createElement('the-card');
          this.nodeInspectors[id].type = 'node-inspector';
          this.nodeInspectors[id].appendChild(inspector);
          this.nodeInspectors[id].addTo(this.contextBar);
        }.bind(this));

        var found;
        Object.keys(this.nodeInspectors).forEach(function (id) {
          found = false;
          this.nodes.forEach(function (node) {
            if (node.id === id) {
              found = true;
            }
          });
          if (!found) {
            this.nodeInspectors[id].parentNode.removeChild(this.nodeInspectors[id]);
            delete this.nodeInspectors[id];
          }
        }.bind(this));
      },
      hideNodeCards: function () {
        for (var id in this.nodeInspectors) {
          this.nodeInspectors[id].parentNode.removeChild(this.nodeInspectors[id]);
          delete this.nodeInspectors[id];
        }
      },
      edgesChanged: function () {
        this.fire('edges', this.edges);
      },
      componentChanged: function () {
        if (this.component && typeof this.component === 'object' && !this.component.name) {
          this.component = null;
        }
        if (this.component && typeof ga === 'function') {
          ga('send', 'event', 'url', 'navigation', 'openComponent');
        }
        this.fire('component', this.component);
      },
      clear: function () {
        this.project = null;
        this.graphs.splice(0, this.graphs.length);
        this.nodes.splice(0, this.nodes.length);
        this.edges.splice(0, this.edges.length);
      },
      group: function (graph, itemKey, item) {
        event.preventDefault();

        if (typeof ga === 'function') {
          ga('send', 'event', 'menu', 'click', 'createGroup');
        }

        // See if the nodes are already part of a group
        var group = '';
        var description = '';
        var selectedNodes = item.nodes;
        selectedNodes.sort();

        graph.groups.forEach(function (grp) {
          var grpNodes = JSON.parse(JSON.stringify(grp.nodes));
          grpNodes.sort();
          if (grpNodes.join(',') == selectedNodes.join(',')) {
            group = grp.name;
            description = grp.metadata.description;
          }
        });

        var dialog = document.createElement('noflo-group-inspector');
        dialog.group = group;
        dialog.groupdescription = description;
        dialog.nodes = selectedNodes;
        dialog.graph = graph;
        document.body.appendChild(dialog);
      },
      subgraph: function (currentGraph, itemKey, item) {
        event.preventDefault();
        if (!this.project) {
          return;
        }

        if (typeof ga === 'function') {
          ga('send', 'event', 'menu', 'click', 'createSubgraph');
        }

        // Ask user to name the new subgraph
        var dialog = document.createElement('noflo-new-graph');
        dialog.runtimes = this.runtimes;
        dialog.type = currentGraph.properties.environment.type;
        dialog.project = currentGraph.properties.project;
        document.body.appendChild(dialog);
        dialog.addEventListener('new', function (event) {
          var graph = event.detail;
          graph.startTransaction('newsubgraph');

          graph.setProperties({
            id: graph.name.replace(' ', '_'),
            project: currentGraph.properties.project
          });

          // Copy nodes
          item.nodes.forEach(function (id) {
            var node = currentGraph.getNode(id);
            graph.addNode(node.id, node.component, node.metadata);
          });

          // Copy edges between nodes
          currentGraph.edges.forEach(function (edge) {
            if (graph.getNode(edge.from.node) && graph.getNode(edge.to.node)) {
              graph.addEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port, edge.metadata);
            }
          });

          // Move IIPs to subgraph as well
          currentGraph.initializers.forEach(function (iip) {
            if (graph.getNode(iip.to.node)) {
              graph.addInitial(iip.from.data, iip.to.node, iip.to.port, iip.metadata);
            }
          });

          // Create subgraph node
          var initialMetadata = currentGraph.getNode(item.nodes[0]).metadata;
          currentGraph.startTransaction('subgraph');
          currentGraph.addNode(graph.properties.id, currentGraph.properties.project + '/' + graph.properties.id, {
            label: graph.name,
            x: initialMetadata.x,
            y: initialMetadata.y
          });

          var subgraphPort = function (node, port) {
            var portName = node + '.' + port;
            return portName.replace(/(.*)\/(.*)(_.*)\.(.*)/, '$2_$4').toLowerCase();
          };

          // Reconnect external edges to subgraph node
          currentGraph.edges.forEach(function (edge) {
            // Edge from outside the new subgraph to a subgraph port
            if (!graph.getNode(edge.from.node) && graph.getNode(edge.to.node)) {
              // Create exported inport
              var inport = subgraphPort(edge.to.node, edge.to.port);
              graph.addInport(inport, edge.to.node, edge.to.port);
              currentGraph.addEdge(edge.from.node, edge.from.port, graph.properties.id, inport);
            }
            // Edge from subgraph port to the outside
            if (graph.getNode(edge.from.node) && !graph.getNode(edge.to.node)) {
              var outport = subgraphPort(edge.from.node, edge.from.port);
              graph.addOutport(outport, edge.from.node, edge.from.port);
              currentGraph.addEdge(graph.properties.id, outport, edge.to.node, edge.to.port);
            }
          });

          // Remove the selected nodes
          item.nodes.forEach(function (id) {
            currentGraph.removeNode(id);
          });

          // Emit new subgraph so that it can be stored
          graph.endTransaction('newsubgraph');
          this.project.graphs.push(graph);
          this.fire('newgraph', graph);

          // End the transaction on the main graph
          setTimeout(function () {
            currentGraph.endTransaction('subgraph');
          }, 5);

          // Editor deselect, hide node inspectors
          if (this.editor) {
            this.editor.selectedNodes = [];
            this.hideNodeCards();
          }
        }.bind(this));
      },
      setHelp: function () {
        // If manually triggered, show something relevant
        if (!this.help) { return; }
        this.help.headline = '$NOFLO_APP_TITLE graph editor';
        this.help.text = 'Here you can edit your Flow-Based graphs and run them. To add nodes, search for components using the search area on the top-left corner.';
      },
      showHelp: function (graph) {
        if (!this.help) {
          return;
        }
        this.help.show('$NOFLO_APP_TITLE graph editor', 'Here you can edit your Flow-Based graphs and run them. To add nodes, search for components using the search area on the top-left corner.');
        graph.once('addNode', function () {
          this.help.close();
        }.bind(this));
      },
      canGetSource: function (component) {
        var componentParts = component.split('/');
        if (!this.project) {
          return false;
        }

        if (this.project && componentParts.shift() === this.project.id) {
          // Local component, see if it is available
          for (i = 0; i < this.project.graphs.length; i++) {
            if (this.project.graphs[i].properties.id === componentParts[0]) {
              return true;
            }
          }
          for (i = 0; i < this.project.components.length; i++) {
            if (this.project.components[i].name === componentParts[0]) {
              return true;
            }
          }
        }

        // Otherwise we check if Runtime can get it for us
        if (!this.runtime) {
          return false;
        }
        if (!this.runtime.definition || !this.runtime.definition.capabilities) {
          return false;
        }
        if (this.runtime.definition.capabilities.indexOf('component:getsource') !== -1) {
          return true;
        }
        return false;
      }
    });
  ;

  (function () {
    "use strict";

    Polymer('the-graph-thumb', {
      graph: null,
      width: 200,
      height: 150,
      thumbscale: 1,
      nodeSize: 60,
      fillStyle: "hsl(184, 8%, 10%)",
      strokeStyle: "hsl(180, 11%, 70%)",
      lineWidth: 0.75,
      theme: "dark",
      edgeColors: [
        "white",
        "hsl(  0, 100%, 46%)",
        "hsl( 35, 100%, 46%)",
        "hsl( 60, 100%, 46%)",
        "hsl(135, 100%, 46%)",
        "hsl(160, 100%, 46%)",
        "hsl(185, 100%, 46%)",
        "hsl(210, 100%, 46%)",
        "hsl(285, 100%, 46%)",
        "hsl(310, 100%, 46%)",
        "hsl(335, 100%, 46%)"
      ],
      ready: function () {
        this.thumbrectangle = [0,0,500,500];
        this.viewrectangle = [0,0,200,150];
      },
      attached: function () {
        this.style.width = this.width + "px";
        this.style.height = this.height + "px";
        this.themeChanged();
      },
      themeChanged: function () {
        if (this.theme === "dark") {
          this.fillStyle = "hsl(184, 8%, 10%)";
          this.strokeStyle = "hsl(180, 11%, 70%)";
          this.edgeColors = [
            "white",
            "hsl(  0, 100%, 46%)",
            "hsl( 35, 100%, 46%)",
            "hsl( 60, 100%, 46%)",
            "hsl(135, 100%, 46%)",
            "hsl(160, 100%, 46%)",
            "hsl(185, 100%, 46%)",
            "hsl(210, 100%, 46%)",
            "hsl(285, 100%, 46%)",
            "hsl(310, 100%, 46%)",
            "hsl(335, 100%, 46%)"
          ];

        } else {
          // Light
          this.fillStyle = "hsl(184, 8%, 75%)";
          this.strokeStyle = "hsl(180, 11%, 20%)";
          // Tweaked to make thin lines more visible
          this.edgeColors = [
            "hsl(  0,   0%, 50%)",
            "hsl(  0, 100%, 40%)",
            "hsl( 29, 100%, 40%)",
            "hsl( 47, 100%, 40%)",
            "hsl(138, 100%, 40%)",
            "hsl(160,  73%, 50%)",
            "hsl(181, 100%, 40%)",
            "hsl(216, 100%, 40%)",
            "hsl(260, 100%, 40%)",
            "hsl(348, 100%, 50%)",
            "hsl(328, 100%, 40%)"
          ];
        }
        // Redraw
        this.redrawGraph();
      },
      drawEdge: function (context, scale, source, target, route) {
        // Draw path
        try {
          context.strokeStyle = this.edgeColors[0];
          if (route) {
            // Color if route defined
            context.strokeStyle = this.edgeColors[route];
          }
          var fromX = Math.round(source.metadata.x*scale)-0.5;
          var fromY = Math.round(source.metadata.y*scale)-0.5;
          var toX = Math.round(target.metadata.x*scale)-0.5;
          var toY = Math.round(target.metadata.y*scale)-0.5;
          context.beginPath();
          context.moveTo(fromX, fromY);
          context.lineTo(toX, toY);
          context.stroke();
        } catch (error) {
        }
      },
      redrawGraph: function () {
        if (!this.graph || !this.graph.edges.length) {
          return;
        }
        var context = this.$.canvas.getContext("2d");
        if (!context) { 
          // ??? 
          setTimeout( this.redrawGraph.bind(this), 500);
          return; 
        }
        // Need the actual context, not polymer-wrapped one
        context = unwrap(context);

        // Reset origin
        context.setTransform(1,0,0,1,0,0);
        // Clear
        context.clearRect(0, 0, this.width, this.height);
        context.lineWidth = this.lineWidth;
        // Find dimensions
        var toDraw = [];
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        var nodes = {};

        // Process nodes
        this.graph.nodes.forEach(function(process){
          if ( process.metadata && !isNaN(process.metadata.x) && !isNaN(process.metadata.y) ) {
            toDraw.push(process);
            nodes[process.id] = process;
            minX = Math.min(minX, process.metadata.x);
            minY = Math.min(minY, process.metadata.y);
            maxX = Math.max(maxX, process.metadata.x);
            maxY = Math.max(maxY, process.metadata.y);
          }
        }.bind(this));

        // Process exported ports
        if (this.graph.inports) {
          Object.keys(this.graph.inports).forEach(function(key){
            var exp = this.graph.inports[key];
            if ( exp.metadata && !isNaN(exp.metadata.x) && !isNaN(exp.metadata.y) ) {
              toDraw.push(exp);
              minX = Math.min(minX, exp.metadata.x);
              minY = Math.min(minY, exp.metadata.y);
              maxX = Math.max(maxX, exp.metadata.x);
              maxY = Math.max(maxY, exp.metadata.y);
            }
          }.bind(this));
        }
        if (this.graph.outports) {
          Object.keys(this.graph.outports).forEach(function(key){
            var exp = this.graph.outports[key];
            if ( exp.metadata && !isNaN(exp.metadata.x) && !isNaN(exp.metadata.y) ) {
              toDraw.push(exp);
              minX = Math.min(minX, exp.metadata.x);
              minY = Math.min(minY, exp.metadata.y);
              maxX = Math.max(maxX, exp.metadata.x);
              maxY = Math.max(maxY, exp.metadata.y);
            }
          }.bind(this));
        }

        // Sanity check graph size
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY) ) {
          return;
        }

        minX -= this.nodeSize;
        minY -= this.nodeSize;
        maxX += this.nodeSize*2;
        maxY += this.nodeSize*2;
        var w = maxX - minX;
        var h = maxY - minY;
        // For the-graph-nav to bind
        this.thumbrectangle[0] = minX;
        this.thumbrectangle[1] = minY;
        this.thumbrectangle[2] = w;
        this.thumbrectangle[3] = h;
        // Scale dimensions
        var scale = (w > h) ? this.width/w : this.height/h;
        this.thumbscale = scale;
        var size = Math.round(this.nodeSize * scale);
        var sizeHalf = size / 2;
        // Translate origin to match
        context.setTransform(1,0,0,1,0-minX*scale,0-minY*scale);

        // Draw connection from inports to nodes
        if (this.graph.inports) {
          Object.keys(this.graph.inports).forEach(function(key){
            var exp = this.graph.inports[key];
            if ( exp.metadata && !isNaN(exp.metadata.x) && !isNaN(exp.metadata.y) ) {
              var target = nodes[exp.process];
              if (!target) {
                return;
              }
              this.drawEdge(context, scale, exp, target, 2);
            }
          }.bind(this));
        }
        // Draw connection from nodes to outports
        if (this.graph.outports) {
          Object.keys(this.graph.outports).forEach(function(key){
            var exp = this.graph.outports[key];
            if ( exp.metadata && !isNaN(exp.metadata.x) && !isNaN(exp.metadata.y) ) {
              var source = nodes[exp.process];
              if (!source) {
                return;
              }
              this.drawEdge(context, scale, source, exp, 5);
            }
          }.bind(this));
        }

        // Draw edges
        this.graph.edges.forEach(function (connection){
          var source = nodes[connection.from.node];
          var target = nodes[connection.to.node];
          if (!source || !target) {
            return;
          }
          this.drawEdge(context, scale, source, target, connection.metadata.route);
        }.bind(this));

        // Draw nodes
        toDraw.forEach(function (node){
          var x = Math.round(node.metadata.x * scale);
          var y = Math.round(node.metadata.y * scale);

          // Outer circle
          context.strokeStyle = this.strokeStyle;
          context.fillStyle = this.fillStyle;
          context.beginPath();
          if (node.process && !node.component) {
            context.arc(x, y, sizeHalf / 2, 0, 2*Math.PI, false);
          } else {
            context.arc(x, y, sizeHalf, 0, 2*Math.PI, false);
          }
          context.fill();
          context.stroke();

          // Inner circle
          context.beginPath();
          var smallRadius = Math.max(sizeHalf-1.5, 1);
          if (node.process && !node.component) {
            // Exported port
            context.arc(x, y, smallRadius / 2, 0, 2*Math.PI, false);
          } else {
            // Regular node
            context.arc(x, y, smallRadius, 0, 2*Math.PI, false);
          }
          context.fill();

        }.bind(this));

      },
      listener: null,
      graphChanged: function (oldGraph, newGraph) {
        if (!this.listener) {
          this.listener = this.redrawGraph.bind(this);
        }
        if (oldGraph) {
          oldGraph.removeListener('endTransaction', this.listener);
        }
        if (!this.graph) {
          return;
        }
        this.graph.on('endTransaction', this.listener);
        this.redrawGraph();
      },
      widthChanged: function () {
        this.style.width = this.width + "px";
        this.redrawGraph();
      },
      heightChanged: function () {
        this.style.height = this.height + "px";
        this.redrawGraph();
      },
      toDataURL: function () {
        return this.$.canvas.toDataURL();
      }
    });

  })();
  ;

    Polymer('noflo-account-settings', {
      user: null,
      gridtoken: '',
      githubtoken: '',
      theme: '',
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      send: function (event) {
        event.preventDefault();
        this.fire('updated', {
          theme: this.theme
        });
        this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    (function () {
      var storage = {
        set: function (key, value, callback) {
          localStorage.setItem(key, value);
          if (callback) {
            callback();
          }
        },
        get: function (key, callback) {
          callback(localStorage.getItem(key));
        },
        remove: function (key) {
          localStorage.removeItem(key);
        }
      };
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Chrome App, use their storage API
        storage.set = function (key, value, callback) {
          var values = {};
          values[key] = value;
          chrome.storage.sync.set(values, callback);
        };
        storage.get = function (key, callback) {
          chrome.storage.sync.get(key, function (items) {
            callback(items[key]);
          });
        };
        storage.remove = function (key) {
          chrome.storage.sync.remove(key);
        };
      }

      Polymer('noflo-account', {
        clientid: '',
        site: 'https://passport.thegrid.io',
        profileSite: 'https://api.flowhub.io',
        gatekeeper: '$NOFLO_OAUTH_GATE',
        redirect: '',
        user: null,
        plan: 'free',
        gridToken: '',
        githubToken: '',
        avatar: '',
        theme: 'dark',
        storage: {
          grid: 'grid-token',
          github: 'github-token',
          githubUsername: 'github-username',
          user: 'grid-user',
          plan: 'flowhub-plan',
          avatar: 'grid-avatar',
          theme: 'flowhub-theme'
        },
        help: null,
        login: function () {
          if (typeof ga === 'function') {
            ga('send', 'event', 'button', 'click', 'login');
          }
          var button = this.shadowRoot.getElementById('loginbutton');
          if (button) {
            button.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
          }
          if (typeof chrome !== 'undefined' && chrome.identity) {
            this.redirect = chrome.identity.getRedirectURL();
            chrome.identity.launchWebAuthFlow({
              interactive: true,
              url: this.getLoginUrl()
            }, function (responseUrl) {
              if (chrome.runtime.lastError) {
                button.innerHTML = 'Login';
                return;
              }
              this.remoteLogin(responseUrl, false);
            }.bind(this));
            return;
          }
          window.location.href = this.getLoginUrl();
        },
        getLoginUrl: function () {
          return this.site + '/login/authorize/github_public?client_id=' + this.clientid  + '&scope=github&response_type=code&redirect_uri=' + encodeURIComponent(this.redirect);
        },
        enteredView: function () {
          this.redirect = window.location.href;
          this.help = document.querySelector('noflo-help');
          this.checkLogin();
          document.body.classList.add(this.theme);
        },
        checkLogin: function () {
          storage.get(this.storage.grid, function (token) {
            if (token) {
              this.gridToken = token;
              storage.get(this.storage.github, function (token) {
                if (!token) {
                  if (this.gridToken) {
                    this.getRemoteUser(this.gridToken);
                  }
                  return;
                }
                this.githubToken = token;
              }.bind(this));
              return;
            }
            this.remoteLogin(window.location.href, true);
          }.bind(this));
          storage.get(this.storage.theme, function (theme) {
            if (!theme) {
              return;
            }
            this.theme = theme;
          }.bind(this));
          storage.get(this.storage.plan, function (plan) {
            if (!plan) {
              return;
            }
            this.plan = plan;
          }.bind(this));
        },
        remoteLogin: function (responseUrl, cleanUp) {
          var code = responseUrl.match(/\?code=(.*)/);
          if (code && code[1]) {
            setTimeout(function () {
              if (this.shadowRoot) {
                var button = this.shadowRoot.getElementById('loginbutton');
                if (button) {
                  button.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
                }
              }
            }, 1);
            var req = new XMLHttpRequest();
            req.onreadystatechange = function () {
              if (req.readyState !== 4) {
                return;
              }
              if (req.status === 200) {
                this.help.close();
                var data = JSON.parse(req.responseText);
                if (data.token) {
                  // Save the access token
                  storage.set(this.storage.grid, data.token, function () {
                    // Clear old user data
                    storage.remove(this.storage.user);

                    if (cleanUp) {
                      // Clean up URL
                      var regex = new RegExp("(?:\\/)?\\?code=" + code[1]);
                      window.location.href = window.location.href.replace(regex, '');
                    } else {
                      this.gridToken = data.token;
                    }
                  }.bind(this));
                }
              } else {
                if (this.shadowRoot) {
                  var button = this.shadowRoot.getElementById('loginbutton');
                  if (button) {
                    button.innerHTML = 'Login';
                  }
                }
                this.clearCache();
              }
            }.bind(this);
            req.open('GET', this.gatekeeper + '/authenticate/' + code[1], true);
            req.send(null);
          } else {
            if (this.help && this.help.show) {
              this.help.show('New to $NOFLO_APP_TITLE?', 'Start by logging into your <a href="http://flowhub.io/" target="_blank">Flowhub</a> account, and you\'ll be able to synchronize projects with GitHub and download examples.');              
            }
          }
        },
        getUser: function (token, refresh) {
          if (refresh) {
            this.getRemoteUser(token);
            return;
          }
          storage.get(this.storage.user, function (user) {
            if (user) {
              try {
                this.user = JSON.parse(user);
                this.fire('user', this.user);
                return;
              } catch (e) {
                storage.remove(this.storage.user);
              }
            }
            this.getRemoteUser(token);
          }.bind(this));
        },
        getRemoteUser: function (token) {
          var req = new XMLHttpRequest();
          req.onreadystatechange = function () {
            if (req.readyState !== 4) {
              return;
            }
            if (req.status === 200) {
              var userData = JSON.parse(req.responseText);

              if (!this.user) {
                storage.set(this.storage.user, req.responseText);
                this.user = userData;
                this.fire('user', this.user);
                this.fire('login', this.user);
              }

              if (!this.githubToken && userData.github && userData.github.token) {
                this.githubToken = userData.github.token;
                storage.set(this.storage.github, this.githubToken);
              }

              if (!this.githubToken && userData.github && userData.github.username) {
                this.githubUsername = userData.github.username;
                storage.set(this.storage.githubUsername, this.githubUsername);
              }

              if (userData.plan && userData.plan.type) {
                this.plan = userData.plan.type;
                storage.set(this.storage.plan, this.plan);
              }

            } else {
              this.clearCache();
            }
          }.bind(this);
          req.open('GET', this.profileSite + '/user', true);
          req.setRequestHeader('Authorization', 'Bearer ' + token);
          req.send(null);
        },
        logout: function () {
          if (typeof ga === 'function') {
            ga('send', 'event', 'button', 'click', 'logout');
          }
          this.user = null;
          this.gridToken = '';
          this.githubToken = '';
          this.githubUsername = '';
          this.avatar = '';
          this.plan = 'free';
          this.clearCache();
        },
        openSettings: function () {
          if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
            return;
          }
          var dialog = document.createElement('noflo-account-settings');
          dialog.githubtoken = this.githubToken;
          dialog.theme = this.theme;
          dialog.user = this.user;
          document.body.appendChild(dialog);
          dialog.addEventListener('updated', function (event) {
            this.theme = event.detail.theme;
            storage.set(this.storage.theme, this.theme);
          }.bind(this));
        },
        clearCache: function () {
          storage.remove(this.storage.grid);
          storage.remove(this.storage.github);
          storage.remove(this.storage.githubUsername);
          storage.remove(this.storage.user);
          storage.remove(this.storage.avatar);
          storage.remove(this.storage.plan);
        },
        userChanged: function () {
          if (!this.user || !this.user.avatar) {
            return;
          }
          storage.get(this.storage.avatar, function (avatar) {
            if (avatar) {
              this.avatar = avatar;
              return;
            }
            var req = new XMLHttpRequest();
            var fileReader = new FileReader();
            req.open('GET', this.user.avatar, true);
            req.responseType = 'blob';
            req.onload = function (e) {
              if (req.status !== 200) {
                return;
              }
              fileReader.onload = function (event) {
                this.avatar = event.target.result;
                storage.set(this.storage.avatar, this.avatar);
              }.bind(this);
              fileReader.readAsDataURL(req.response);

            }.bind(this);
            req.send();
          }.bind(this));
        },
        gridTokenChanged: function () {
          if (this.gridToken) {
            this.getUser(this.gridToken);
          }
          this.fire('gridtoken', this.gridToken);
        },
        githubTokenChanged: function () {
          this.fire('githubtoken', this.githubToken);
        },
        themeChanged: function (oldTheme, newTheme) {
          this.fire('theme', this.theme);
          document.body.classList.remove(oldTheme);
          document.body.classList.add(newTheme);
        }
      });
    })();
  ;

    Polymer('noflo-new-project', {
      projectId: '',
      name: '',
      type: 'noflo-browser',
      runtimes: null,
      canSend: false,
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      nameChanged: function () {
        if (this.name && this.projectId) {
          this.canSend = true;
        } else {
          this.canSend = false;
        }
      },
      projectIdChanged: function () {
        if (this.name && this.projectId) {
          this.canSend = true;
        } else {
          this.canSend = false;
        }
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name || !this.projectId) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'newProject');
        }
        this.fire('new', {
          id: this.projectId.replace(' ', '-'),
          name: this.name,
          type: this.type,
          graphs: [],
          components: []
        });
        this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-new-runtime', {
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-main', {
      open: true,
      localProjects: [],
      remoteProjects: [],
      userRuntimes: [],
      examples: [
        {
          label: 'Photo booth',
          id: '7804187'
        },
        {
          label: 'Animated clock',
          id: '7135158'
        },
        {
          label: 'Canvas pattern',
          id: '1319c76fe006fb34c9c9'
        }
      ],
      githubToken: '',
      gridToken: '',
      user: null,
      projectList: 'local',
      languages: [
        'HTML',
        'JavaScript',
        'CoffeeScript',
        'C++'
      ],
      registry: null,
      help: null,
      enteredView: function () {
        this.openChanged();
        this.$.mainaccount.addEventListener('githubtoken', function (event) {
          if (typeof event.detail !== 'string') {
            this.githubToken = '';
            return;
          }
          this.githubToken = event.detail;
        }.bind(this));
        this.$.mainaccount.addEventListener('gridtoken', function (event) {
          if (typeof event.detail !== 'string') {
            this.gridToken = '';
            return;
          }
          this.gridToken = event.detail;
        }.bind(this));
        this.$.mainaccount.addEventListener('user', function (event) {
          this.user = event.detail;
          this.fire('user', this.user);
        }.bind(this));
        this.$.mainaccount.addEventListener('login', function (event) {
          this.fetchFlowhub();
        }.bind(this));
        this.$.mainaccount.addEventListener('theme', function (event) {
          window.setTimeout(function () {
            this.fire('theme', event.detail);
          }.bind(this), 1000);
        }.bind(this));
        this.registry = require('flowhub-registry');
        this.help = document.querySelector('noflo-help');

        // Hide projects if not logged in
        this.gridTokenChanged();
      },
      token: function () {
        this.fire('githubtoken', this.githubToken);
      },
      openChanged: function () {
        if (String(this.open) === 'true') {
          // Make main visible
          this.style.height = '100%';
          // Update runtime registry every time we go to the main view
          this.fetchFlowhub();
          return;
        }
        this.style.height = '0px';
      },
      openLocal: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        this.projectList = 'local';
      },
      openGithub: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (!this.githubToken) {
          return;
        }
        event.preventDefault();
        this.projectList = 'github';
        if (this.remoteProjects.length === 0) {
          setTimeout(function () {
            this.fetchGithub();
          }.bind(this), 1);
        }
      },
      downloadProject: function (event, details, sender) {
        event.preventDefault();
        if (!this.githubToken) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'pullGithub');
        }
        this.fire('download', {
          project: {
            id: sender.getAttribute('data-name'),
            name: sender.getAttribute('data-name'),
            repo: sender.getAttribute('data-repo'),
            // TODO: Figure out platform from repo contents
            type: 'html',
            graphs: [],
            components: []
          },
          token: this.githubToken
        });
      },
      fetchGithub: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.githubToken) {
          return;
        }
        this.remoteProjects = [];
        var button = this.shadowRoot.getElementById('fetchgithub');
        if (button) {
          button.classList.add('fa-spin');
        }
        var req = new XMLHttpRequest();
        req.onreadystatechange = function () {
          if (req.readyState !== 4) {
            return;
          }
          if (button) {
            button.classList.remove('fa-spin');
          }
          if (req.status !== 200) {
            var error;
            try {
              var data = JSON.parse(req.responseText);
              error = data.message;
            } catch (e) {
              error = 'Unknown Error';
            }
            this.help.show('Error accessing GitHub', 'GitHub API responded with: ' + error + '. You may want to check your GitHub API key in the account settings.');
            return;
          }
          var repos = JSON.parse(req.responseText);
          repos.forEach(function (repo) {
            if (!repo.permissions.push) {
              return;
            }
            for (var i = 0; i < this.localProjects.length; i++) {
              if (this.localProjects[i].repo === repo.full_name) {
                return;
              }
            }
            if (repo.language !== null && this.languages.indexOf(repo.language) === -1) {
              return;
            }
            this.remoteProjects.push({
              name: repo.name,
              description: repo.description,
              repo: repo.full_name,
              language: repo.language
            });
          }.bind(this));
        }.bind(this);
        req.open('GET', 'https://api.github.com/user/repos?type=public&sort=pushed&access_token=' + encodeURIComponent(this.githubToken), true);
        req.setRequestHeader('Accept', 'application/vnd.github.beta+json');
        req.send(null);
      },
      runtimes: function (runtime) {
        if (runtime.protocol === 'iframe') {
          return;
        }
        if (this.userRuntimes.indexOf(runtime) === -1) {
          this.userRuntimes.push(runtime);
        }
        this.fire('runtimes', this.userRuntimes);
      },
      fetchFlowhub: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.gridToken) {
          return;
        }
        var button = this.$.fetchflowhub;
        button.classList.add('fa-spin');
        this.registry.list(this.gridToken, function (err, runtimes) {
          button.classList.remove('fa-spin');
          if (err) {
            return;
          }
          var found = [];
          runtimes.forEach(function (runtime) {
            var inStore = null;
            if (runtime.protocol === 'iframe') {
              return;
            }
            this.userRuntimes.forEach(function (storedRuntime) {
              if (storedRuntime.id === runtime.runtime.id) {
                inStore = storedRuntime;
                found.push(inStore.id);
              }
            });
            if (!inStore) {
              this.fire('runtime', runtime.runtime);
              this.userRuntimes.push(runtime.runtime);
              return;
            }

            // Update existing
            var changed = false;
            Object.keys(runtime.runtime).forEach(function (attr) {
              if (inStore[attr] === runtime.runtime[attr]) {
                return;
              }
              inStore[attr] = runtime.runtime[attr];
              changed = true;
            });
            if (changed) {
              this.fire('runtime', inStore);
            }
          }.bind(this));

          // Remove deleted runtimes
          this.userRuntimes.forEach(function (runtime, index) {
            if (found.indexOf(runtime.id) !== -1) {
              return;
            }
            if (runtime.protocol === 'iframe') {
              return;
            }
            this.fire('removedruntime', runtime);
            this.userRuntimes.splice(index, 1);
          }.bind(this));
        }.bind(this));
      },
      gridTokenChanged: function () {
        // Hide projects if not logged in
        // Done like this instead of template if so this.$.fetchflowhub etc work
        if (this.gridToken) {
          this.$.loginrequired.style.display = 'block';
        } else {
          this.$.loginrequired.style.display = 'none';
        }
      },
      preparedefaults: function () {
        // Every NoFlo UI instance should have at least the local IFRAME runtime available
        var hasIframeRuntime = false;
        var runtime = new this.registry.Runtime({
          label: 'Local NoFlo HTML5 environment',
          id: require('uuid')(),
          protocol: 'iframe',
          address: 'preview/iframe.html',
          type: 'noflo-browser'
        });
        this.userRuntimes.push(runtime.runtime);
        this.fire('runtimes', this.userRuntimes);
      },
      createdproject: function (project) {
        window.location.hash = '#project/' + project.id + '/' + project.main;
      },
      openProject: function (event, details, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var project = null;
        this.localProjects.forEach(function (p) {
          if (p.id === sender.getAttribute('data-id')) {
            project = p;
          }
        });
        if (!project) {
          return;
        }
        window.location.hash = '#project/' + project.id + '/' + project.main;
      },
      openExample: function (event, details, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        window.location.hash = '#example/' + sender.getAttribute('data-id');
      },
      newProject: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-project');
        dialog.runtimes = this.userRuntimes;
        this.parentNode.parentNode.appendChild(dialog);
        dialog.addEventListener('new', function (event) {
          this.fire('newproject', event.detail);
        }.bind(this));
      },
      newRuntime: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-runtime');
        dialog.user = this.user;
        this.parentNode.parentNode.appendChild(dialog);
      },
      projects: function (project) {
        this.localProjects.push(project);
        this.fire('projects', this.localProjects);
      },
      graphs: function (graph) {
        if (!graph.properties.project) {
          // TODO: Create a project for old-style sketches
          return;
        }
        this.localProjects.forEach(function (project) {
          if (!project.graphs) {
            project.graphs = [];
          }
          if (!project.components) {
            project.components = [];
          }
          if (graph.properties.project !== project.id) {
            return;
          }
          if (!project.main) {
            project.mainGraph = graph;
            project.main = graph.properties.id;
          }
          if (graph.properties.id === project.main) {
            project.mainGraph = graph;
          }
          for (var i = 0; i < project.graphs.length; i++) {
            if (project.graphs[i].properties.id === graph.properties.id) {
              // We already have this graph in the project
              return;
            }
          }
          project.graphs.push(graph);
        });
      },
      components: function (component) {
        this.localProjects.forEach(function (project) {
          if (!project.components) {
            project.components = [];
          }
          if (component.project !== project.id) {
            return;
          }
          for (var i = 0; i < project.components.length; i++) {
            if (project.components[i].id === component.id) {
              project.components[i] = component;
              return;
            }
          }
          project.components.push(component);
        });
      }
    });
  ;

    Polymer('noflo-preview', {
      runtime: null,
      returnTo: null,
      maximized: false,
      enteredView: function () {
      },
      button: function (event, data, sender) {
        event.preventDefault();
        var action = sender.getAttribute('data-action');
        this[action]();
      },
      maximizedChanged: function() {
        if (this.maximized) {
          this.parentNode.classList.add('maximized');
          this.$.preview.classList.add('maximized');
        } else {
          this.parentNode.classList.remove('maximized');
          this.$.preview.classList.remove('maximized');
        }
        this.fire('maximized', this.maximized);
      },
      maximize: function () {
        this.maximized = true;
      },
      minimize: function () {
        this.maximized = false;
      },
      runtimeChanged: function () {
        // Capture runtime container to here
        this.$.preview.appendChild(this.runtime.getElement());
      },
      leftView: function () {
        if (!this.runtime || !this.returnTo) {
          return;
        }
        // Return runtime element to main container
        this.returnTo.appendChild(this.runtime.getElement());
      }
    });
  ;

    Polymer('noflo-runtime-selector', {
      available: [],
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
        this.runtimes.forEach(function (rt) {
          if ((rt.type == this.graph.properties.environment.type || this.graph.properties.environment.type === 'all' )&& this.available.indexOf(rt) === -1) {
            this.available.push(rt);
          }
        }.bind(this));
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      selectRuntime: function (event, details, sender) {
        var id = sender.getAttribute('data-id');
        this.runtimes.forEach(function (runtime) {
          if (runtime.id === id) {
            this.fire('runtime', runtime);
            this.close();
          }
        }.bind(this));
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-runtime', {
      currentGraph: null,
      graphs: null,
      runtime: null,
      runtimes: [],
      online: false,
      execution: {
        label: 'not started',
        running: false
      },
      card: null,
      panel: null,
      edges: null,
      wasConnected: false,
      graphsChanged: function () {
        if (!this.graphs || this.graphs.length === 0) {
          this.currentGraph = null;
          return;
        }
        // Use the top-level graph as the runtime main graph
        this.currentGraph = this.graphs[0];
      },
      edgesChanged: function () {
        this.sendEdges();
      },
      sendEdges: function () {
        if (!this.runtime || !this.edges || !this.edges.map || !this.currentGraph) {
          return;
        }
        var edgeData = this.edges.map(function (edge) {
          return {
            src: {
              process: edge.from.node,
              port: edge.from.port
            },
            tgt: {
              process: edge.to.node,
              port: edge.to.port
            }
          };
        });
        this.runtime.sendNetwork('edges', {
          edges: edgeData,
          graph: this.currentGraph.properties.id
        });
      },
      clearRuntime: function () {
        for (var i = 0; i < this.runtimes.length; i++) {
          if (this.runtimes[i].graph === this.currentGraph.properties.id) {
            this.runtimes[i].graph = null;
            this.fire('runtime', this.runtimes[i]);
          }
        }
        this.runtime = null;
        this.currentGraphChanged();
      },
      currentGraphChanged: function () {
        this.wasConnected = false;
        if (this.runtime) {
          this.stop();
          this.execution.running = false;
          this.execution.stopped = true;
          this.runtime = null;
        }
        if (this.card) {
          this.card.parentNode.removeChild(this.card);
          this.card = null;
        }
        if (this.runtimeSelector) {
          if (this.runtimeSelector.parentNode) {
            this.runtimeSelector.parentNode.removeChild(this.runtimeSelector);
          }
          this.runtimeSelector = null;
        }
        if (!this.currentGraph || !this.currentGraph.properties.id) {
          return;
        }

        // Fix legacy env type setting
        this.updateGraphType(this.currentGraph);

        // Subscribe to possible type changes
        this.currentGraph.on('changeProperties', function (newProps, oldProps) {
          if (newProps.environment.type !== oldProps.environment.type) {
            this.currentGraphChanged();
          }
        }.bind(this));

        // Find runtime for Graph
        var iframeRuntime = null;
        for (var i = 0; i < this.runtimes.length; i++) {
          if (this.runtimes[i].graph === this.currentGraph.properties.id) {
            this.fire('runtime', this.runtimes[i]);
            return;
          }
          if (this.runtimes[i].protocol === 'iframe') {
            iframeRuntime = this.runtimes[i];
          }
        }
        if (this.currentGraph.properties.environment.type === 'noflo-browser' && iframeRuntime) {
          // Fall-back, select the IFRAME runtime as default
          this.fire('runtime', iframeRuntime);
        }
        return;
      },
      runtimeChanged: function () {
        this.online = false;
        this.execution.running = false;
        this.execution.label = 'not started';
        this.panel.open = false;

        if (!this.runtime) {
          return;
        }
        this.runtime.setMain(this.currentGraph);
        this.runtime.on('status', function (status) {
          this.online = status.online;
          if (!this.online) {
            this.hideCard();
            this.execution.running = false;
            this.execution.label = 'not started';
            if (this.panel) {
              this.panel.open = false;
            }
          }
        }.bind(this));
        this.runtime.on('execution', function (status) {
          if (status.running) {
            this.execution.running = true;
          } else {
            this.execution.running = false;
          }
          this.execution.label = status.label;
        }.bind(this));
        this.runtime.on('network', function (message) {
          if (message.command === 'error') {
            this.notify('Error', message.payload.message);
            return;
          }
        }.bind(this));
      },
      updateGraphType: function (graph) {
        var type = 'noflo-browser';
        if (!graph.properties.environment) {
          graph.setProperties({
            environment: {
              type: type
            }
          });
        }
        var env = JSON.parse(JSON.stringify(graph.properties.environment));
        if (env.type) {
          return;
        }
        switch (env.runtime) {
          case 'websocket':
            type = 'noflo-nodejs';
            break;
          default:
            type = 'noflo-browser';
            break;
        }
        env.type = type;
        graph.setProperties({
          environment: env
        });
      },
      start: function (event) {
        event.preventDefault();
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'startRuntime');
        }
        this.requestNotificationPermission();
        if (this.card) {
          this.sendEdges();
          this.runtime.start();
          return;
        }
        this.showCard();
        if (this.runtime.getType() === 'iframe') {
          this.runtime.once('connected', function () {
            this.runtime.start();
          }.bind(this));
          return;
        }
        this.runtime.start();
      },
      stop: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'stopRuntime');
        }
        this.runtime.stop();
      },
      reconnect: function (event) {
        if (event) {
          event.preventDefault();
        }
        this.runtime.reconnect();
      },
      showCard: function () {
        if (this.card || !this.panel) {
          return;
        }
        this.card = document.createElement('the-card');
        this.card.type = 'noflo-runtime-preview';
        // Move the preview element of the runtime into the card
        var preview = document.createElement('noflo-preview');
        preview.classList.add('the-card-content');
        preview.runtime = this.runtime;
        preview.returnTo = this.parentNode;
        this.card.appendChild(preview);
        this.card.addTo(this.panel.getMain());
        if (this.runtime.definition.protocol === 'iframe') {
          this.panel.open = true;
        }

        // Handle maximization
        var originalSize = this.panel.size;
        preview.addEventListener('maximized', function (e) {
          if (e.detail === true) {
            this.panel.size = window.innerWidth - 36;
          } else {
            this.panel.size = originalSize;
          }
        }.bind(this));
      },
      hideCard: function () {
        if (!this.card) {
          return;
        }
        var el = this.runtime.getElement();
        this.card.parentNode.removeChild(this.card);
        this.card = null;
      },
      selectRuntime: function () {
        if (this.graphs.length === 0) {
          return;
        }
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        this.runtimeSelector = document.createElement('noflo-runtime-selector');
        this.runtimeSelector.graph = this.currentGraph;
        this.runtimeSelector.runtimes = this.runtimes;
        this.runtimeSelector.addEventListener('runtime', function (event) {
          var runtime = event.detail;
          runtime.graph = this.currentGraph.properties.id;
          this.fire('runtime', runtime);
          this.fire('changed', runtime);
        }.bind(this));
        this.parentNode.parentNode.appendChild(this.runtimeSelector);
      },
      canNotify: function () {
        return ("Notification" in window);
      },
      allowedToNotify: function () {
        if (!this.canNotify()) {
          return false;
        }
        if (Notification.permission === "denied") {
          return false;
        }
        return true;
      },
      requestNotificationPermission: function () {
        if (!this.canNotify()) {
          return;
        }
        if (!this.allowedToNotify()) {
          return;
        }
        // Don't bug them if they already clicked
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission(function (permission) {
            // Whatever the user answers, we make sure we store the information
            if(!('permission' in Notification)) {
              Notification.permission = permission;
            }
          });
        }
      },
      lastNotification: null,
      notify: function (title, message) {
        if (!this.allowedToNotify()) {
          if (!console || !console.log) {
            return;
          }
          console.log(title + ': ' + message);
          return;
        }
        // Check if notification is duplicate
        if (this.lastNotification && this.lastNotification.title === title && this.lastNotification.body === message) {
          this.lastNotification.close();
        }
        this.lastNotification = new Notification(title, {
          body: message,
          icon: 'app/noflo-64.png'
        });
      }
    });
  ;

    Polymer('noflo-edge-menu', {
      edges: [],
      graph: null,
      routes: [0, 1, 2, 3, 4, 5, 6, 7, 9, 10],
      clear: function (event) {
        event.preventDefault();
        var edge;
        while(this.edges.length) {
          edge = this.edges.pop();
          edge.selected = false;
        }
      },
      remove: function (event) {
        event.preventDefault();
        while(this.edges.length) {
          var edge = this.edges.pop();
          if (edge.parentNode) {
            edge.parentNode.removeChild(edge);
          }
        }
      },
      setRoute: function (event, detail, sender) {
        event.preventDefault();
        var route = parseInt(sender.getAttribute('name'), 10);
        this.graph.startTransaction('changeroute');

        this.edges.forEach(function (edge) {
          this.graph.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, {
            route: route
          });
        }.bind(this));

        this.graph.endTransaction('changeroute');
      }
    });
  ;

    Polymer('noflo-edge-inspector', {
      lastlog: 0,
      showlogs: 20,
      edge: null,
      log: null,
      graph: null,
      sourceNode: '',
      sourcePort: '',
      targetNode: '',
      targetPort: '',
      route: 0,
      frameReq: null,
      leftView: function () {
        if (this.frameReq) {
          window.cancelAnimationFrame(this.frameReq);
        }
      },
      edgeChanged: function () {
        var src = this.edge.from;
        var tgt = this.edge.to;
        this.sourceNode = this.nodeLabel(src.node);
        this.sourcePort = src.port;
        this.targetNode = this.nodeLabel(tgt.node);
        this.targetPort = tgt.port;
        this.route = this.edge.metadata.route;
        this.animate();
      },
      nodeLabel: function (node) {
        var extractLibrary = node.split('/');
        if (extractLibrary.length > 1) {
          node = extractLibrary[1];
        }
        return node.split('_')[0];
      },
      clear: function () {
        this.log.clear();
        this.lastlog = 0;
        this.$.events.innerHTML = '';
      },
      animate: function () {
        if (!this.log) {
          return;
        }
        // TODO top-level animation loop
        this.frameReq = window.requestAnimationFrame(this.animate.bind(this));
        if (this.log.length <= this.lastlog) {
          return;
        }
        this.renderLogs();
        this.lastlog = this.log.length;
      },
      renderLogs: function () {
        var first = this.lastlog;
        var i, item, li, content;
        if (this.log.length - this.lastlog > this.showlogs) {
          first = this.log.length - this.showlogs;
        }
        var fragment = document.createDocumentFragment();
        for (i = first; i < this.log.length; i++) {
          item = this.log.get(i);
          if (!item) {
            continue;
          }
          li = document.createElement('li');
          li.classList.add(item.type);
          if (item.group) {
            content = document.createTextNode(item.group);
          } else {
            var cleaned = item.data;
            if (typeof item.data === 'object') {
              cleaned = JSON.stringify(item.data, null, 2);
            }
            content = document.createTextNode(cleaned);
          }
          li.appendChild(content);
          fragment.appendChild(li);
        }
        this.$.events.appendChild(fragment);
        // Scroll to bottom
        while (this.$.events.childElementCount > this.showlogs) {
          this.$.events.removeChild(this.$.events.firstChild);
        }
        this.$.events.scrollTop = this.$.events.scrollHeight;
      }
    });
  ;

  (function () {
    function CircularBuffer(n) {
      this._array= new Array(n);
      this.length= 0;
    }
    CircularBuffer.prototype.toString= function() {
      return '[object CircularBuffer('+this._array.length+') length '+this.length+']';
    };
    CircularBuffer.prototype.get= function(i) {
      if (i<0 || i<this.length-this._array.length)
      return undefined;
      return this._array[i%this._array.length];
    };
    CircularBuffer.prototype.set = function(i, v) {
      if (i<0 || i<this.length-this._array.length)
      throw CircularBuffer.IndexError;
      while (i>this.length) {
        this._array[this.length%this._array.length] = undefined;
        this.length++;
      }
      this._array[i%this._array.length] = v;
      if (i==this.length)
      this.length++;
    };
    CircularBuffer.prototype.push = function(v) {
      this._array[this.length%this._array.length] = v;
      this.length++;
    };
    CircularBuffer.prototype.clear = function() {
      this._array = new Array(this._array.length);
      this.length = 0;
    };
    CircularBuffer.IndexError= {};

    Polymer('noflo-packets', {
      logs: {},
      runtime: null,
      panel: null,
      edges: [],
      currentgraph: null,
      runtimeChanged: function () {
        this.logs = {};
      },
      packet: function (packet) {
        if (!packet.edge) {
          return;
        }
        this.ensureLog(packet.edge);
        this.logs[packet.edge].push(packet);
      },
      edgeInspectors: {},
      edgesChanged: function () {
        if (this.edges.length) {
          this.showEdgeCards();
        } else {
          this.hideEdgeCards();
        }
      },
      genEdgeId: function (edge) {
        var fromStr = edge.from.node + '() ' + edge.from.port.toUpperCase();
        var toStr = edge.to.port.toUpperCase() + ' ' + edge.to.node + '()';
        return fromStr + ' -> ' + toStr;
      },
      ensureLog: function (id) {
        if (this.logs[id]) {
          return;
        }
        this.logs[id] = new CircularBuffer(40);
      },
      showEdgeCards: function () {
        if (!this.edgeMenu) {
          var menu = document.createElement('noflo-edge-menu');
          menu.edges = this.edges;
          menu.graph = this.currentgraph;
          this.edgeMenu = document.createElement('the-card');
          this.edgeMenu.type = 'edge-menu';
          this.edgeMenu.dialog = menu;
          this.edgeMenu.appendChild(menu);
          this.edgeMenu.addTo(this.panel);
        } else {
          this.edgeMenu.dialog.edges = this.edges;
        }

        this.edges.forEach(function (edge) {
          var id = this.genEdgeId(edge);
          if (this.edgeInspectors[id]) {
            return;
          }
          this.ensureLog(id);
          var inspector = document.createElement('noflo-edge-inspector');
          inspector.edge = edge;
          inspector.log = this.logs[id];
          inspector.graph = this.currentgraph;
          this.edgeInspectors[id] = document.createElement('the-card');
          this.edgeInspectors[id].type = 'edge-inspector';
          this.edgeInspectors[id].appendChild(inspector);
          this.edgeInspectors[id].addTo(this.panel);
        }.bind(this));

        var found;
        Object.keys(this.edgeInspectors).forEach(function (id) {
          found = false;
          this.edges.forEach(function (edge) {
            if (this.genEdgeId(edge) === id) {
              found = true;
            }
          }.bind(this));
          if (!found) {
            this.edgeInspectors[id].parentNode.removeChild(this.edgeInspectors[id]);
            delete this.edgeInspectors[id];
          }
        }.bind(this));
      },
      hideEdgeCards: function () {
        if (this.edgeMenu) {
          this.edgeMenu.parentNode.removeChild(this.edgeMenu);
          this.edgeMenu = null;
        }
        for (var id in this.edgeInspectors) {
          this.edgeInspectors[id].parentNode.removeChild(this.edgeInspectors[id]);
          delete this.edgeInspectors[id];
        }
      },
    });
  })();
;

    Polymer('noflo-menu', {
      buttons: [],
      clicked: function (event, detail, sender) {
        event.preventDefault();
        this.buttons.forEach(function (button) {
          if (button.id !== sender.getAttribute('id')) {
            return;
          }
          this.fire('click', button.id);
          if (button.search) {
            this.fire('search', button.search);
            return;
          }
          button.action();
        }.bind(this));
      }
    });
  ;

    Polymer('noflo-search-results', {
      results: [],
      search: '',
      clicked: function (event, details, sender) {
        event.preventDefault();
        var index = sender.getAttribute('data-index');
        var result = this.results[index];
        if (!result || !result.action) {
          return;
        }
        this.fire('resultclick', result);
        result.action();
      }
    });
  ;

    Polymer('noflo-graph-inspector', {
      description: '',
      type: '',
      preview: '',
      graph: null,
      project: null,
      runtimes: [],
      isMain: false,
      inGraph: [],
      downloadUrl: '',
      updateName: function (event, detail, sender) {
        this.graph.name = sender.textContent;
      },
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
        if (!this.graph) {
          return;
        }

        this.description = this.graph.properties.description;
        this.type = this.graph.properties.environment.type;

        this.inGraph = [];
        this.isMain = false;
        if (this.project) {
          if (this.graph.properties.id === this.project.main) {
            this.isMain = true;
          } else {
            this.project.graphs.forEach(function (graph) {
              graph.nodes.forEach(function (node) {
                if (node.component === this.graph.properties.id || node.component === this.project.id + '/' + this.graph.properties.id) {
                  this.inGraph.push(graph);
                }
              }.bind(this));
            }.bind(this));
          }
        }
        this.prepareDownload();
      },
      prepareDownload: function () {
        if (!window.Blob || !window.URL) {
          return;
        }
        var blob = new Blob([JSON.stringify(this.graph, null, 4)], {
          type: "application/json"
        });
        try {
          this.downloadUrl = URL.createObjectURL(blob);
        } catch (e) {
          return;
        }
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      typeChanged: function () {
        if (this.type == 'noflo-browser') {
          this.prepareEditor();
        } else {
          this.$.content.innerHTML = '';
          this.previewEditor = null;
        }
      },
      prepareEditor: function () {
        this.previewEditor = CodeMirror(this.$.content, {
          lineNumbers: true,
          value: this.graph.properties.environment.content || '',
          language: 'htmlmixed',
          theme: 'mdn-like'
        });
        this.previewEditor.setSize(576, 144);
        this.previewEditor.on('change', function () {
          this.preview = this.previewEditor.getValue();
          this.graph.properties.environment.content = this.previewEditor.getValue();
        }.bind(this));
      },
      save: function () {
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'saveGraphProperties');
        }
        var env = JSON.parse(JSON.stringify(this.graph.properties.environment));
        env.content = this.preview;
        env.type = this.type;
        this.graph.setProperties({
          environment: env,
          description: this.description
        });
        this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-search', {
      menuCard: null,
      resultsCard: null,
      results: [],
      search: null,
      parentPath: '',
      graph: null,
      graphs: [],
      component: null,
      panel: null,
      runtimes: [],
      graphInspector: null,
      componentChanged: function () {
        if (!this.component || !this.component.name) {
          // Component nullified, ensure we recount graphs
          this.graphsChanged();
          return;
        }
        this.graph = null;
        this.updateParentPath();
      },
      graphsChanged: function () {
        if (!this.graphs.length || (this.component && this.component.name)) {
          this.graph = null;
        } else {
          this.graph = this.graphs[this.graphs.length - 1];
        }
        this.updateParentPath();
        if (this.graphInspector) {
          if (this.graphInspector.parentNode) {
            this.graphInspector.parentNode.removeChild(this.graphInspector);
          }
          this.graphInspector = null;
        }
        this.blur();
      },
      updateParentPath: function () {
        this.parentPath = '';
        this.graphs.forEach(function (graph, idx) {
          if (this.graph && idx >= this.graphs.length - 1) {
            return;
          }
          if (idx === 0) {
            this.parentPath += '/' + encodeURIComponent(graph.properties.id);
          } else {
            var previous = this.graphs[idx - 1];
            var node = null;
            previous.nodes.forEach(function (node) {
              if (node.component === this.project.id + '/' + graph.properties.id || node.component === graph.properties.id) {
                this.parentPath += '/' + encodeURIComponent(node.id);
              }
            }.bind(this));
          }
        }.bind(this));
      },
      enteredView: function () {
        this.observer = new ArrayObserver(this.results);
        this.observer.open(this.resultsModified.bind(this));
        this.blur();
      },
      focus: function () {
        if (this.component && this.component.name) {
          return;
        }
        this.classList.remove('overlay');
        this.$.search.focus();
        this.search = '';
      },
      blur: function () {
        this.clearResults();
        this.classList.add('overlay');
        this.search = null;
      },
      toggle: function () {
        if (this.classList.contains('overlay')) {
          this.focus();
          return;
        }
        this.blur();
      },
      clearResults: function () {
        while (this.results.length) {
          this.results.pop();
        }
      },
      checkField: function () {
        event.preventDefault();
        if (this.search === '') {
          if (this.resultsCard) {
            this.resultsCard.parentNode.removeChild(this.resultsCard);
            this.resultsCard = null;
          }
          this.blur();
          return;
        }
      },
      searchChanged: function () {
        this.clearResults();

        if (this.search && typeof ga === 'function') {
          ga('send', 'event', 'search', 'input', 'newSearch');
        }

        if (this.resultsCard) {
          this.resultsCard.getElementsByTagName('noflo-search-results')[0].search = this.search;
        }
        this.fire('search', {
          search: this.search
        });
      },
      resultsModified: function () {
        if (this.resultsCard || this.search === null) {
          return;
        }
        if (this.results.length === 0) {
          if (this.resultsCard) {
            this.resultsCard.parentNode.removeChild(this.resultsCard);
            this.resultsCard = null;
          }
          return;
        }
        var results = document.createElement('noflo-search-results');
        results.results = this.results;
        results.search = this.search;
        results.addEventListener('resultclick', function () {
          this.blur();
        }.bind(this));

        this.resultsCard = document.createElement('the-card');
        this.resultsCard.type = 'noflo-search-results';
        this.resultsCard.appendChild(results);
        this.resultsCard.addTo(this.panel, true);
      },
      showGraphInspector: function (event) {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        if (this.graphs.length === 0) {
          return;
        }
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'search', 'click', 'graphProperties');
        }
        this.graphInspector = document.createElement('noflo-graph-inspector');
        this.graphInspector.graph = this.graph;
        this.graphInspector.project = this.project;
        this.graphInspector.runtimes = this.runtimes;
        this.parentNode.parentNode.appendChild(this.graphInspector);
      },
    });
  ;

    Polymer('noflo-library', {
      search: null,
      editor: null,
      graphs: [],
      project: null,
      addNode: function (component) {
        var num = 60466176; // 36^5
        num = Math.floor(Math.random() * num);
        var id = component + '_' + num.toString(36);

        // TODO fix with pan
        var pan = this.editor.$.graph.getPan();
        var scale = this.editor.$.graph.getScale();

        this.editor.graph.addNode(id, component, {
          label: component,
          x: (-pan[0] + 334) / scale,
          y: (-pan[1] + 100) / scale
        });
      },
      searchChanged: function () {
        if (!this.search) {
          return;
        }
        if (typeof this.search.search !== 'string') {
          return;
        }
        if (!this.editor) {
          return;
        }
        var library = this.editor.getLibrary();
        if (!library) {
          return;
        }
        Object.keys(library).forEach(function (name) {
          if (this.search.search !== '' && name.toLowerCase().indexOf(this.search.search.toLowerCase()) === -1) {
            return;
          }
          var component = this.editor.getComponent(name);
          if (component.subgraph && this.project) {
            var nameParts = component.name.split('/');
            if (nameParts[0] === this.project.id) {
              for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].properties.id === nameParts[1]) {
                  // Prevent circular dependencies
                  return;
                }
              }
            }
          }
          this.fire('result', {
            label: component.name,
            icon: component.icon || 'cog',
            description: component.description,
            action: function () {
              this.addNode(component.name);
            }.bind(this)
          });
        }.bind(this));
      }
    });
  ;

    Polymer('noflo-new-component', {
      name: '',
      project: '',
      language: 'coffeescript',
      canSend: false,
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      nameChanged: function () {
        if (this.name && this.project) {
          this.canSend = true;
        } else {
          this.canSend = false;
        }
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'newComponent');
        }
        this.fire('new', {
          name: this.name,
          language: this.language,
          project: this.project,
          code: '',
          tests: ''
        });
        this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-project-inspector', {
      repo: '',
      name: '',
      main: '',
      enteredView: function () {
        document.getElementById('container').classList.add('blur');
      },
      leftView: function () {
        document.getElementById('container').classList.remove('blur');
      },
      projectChanged: function () {
        this.repo = this.project.repo;
        this.name = this.project.name;
        this.main = this.project.main;
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'saveProjectProperties');
        }
        var type = this.project.type;
        this.project.graphs.forEach(function (graph) {
          if (graph.id === this.main && graph.properties.environment.runtime) {
            type = graph.properties.environment.runtime;
            this.project.mainGraph = graph;
          }
        }.bind(this));
        this.fire('updated', {
          id: this.project.id,
          name: this.name,
          main: this.main,
          type: type,
          repo: this.repo
        });
        this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-project', {
      project: null,
      commitMessage: '',
      githubtoken: '',
      graphs: [],
      runtimes: [],
      runtime: null,
      graph: null,
      component: null,
      canComponent: true,
      graphsChanged: function () {
        if (this.graphs.length) {
          this.graph = this.graphs[this.graphs.length - 1];
        } else {
          this.graph = null;
        }
      },
      runtimeChanged: function () {
        if (this.runtime && this.runtime.definition && this.runtime.definition.capabilities) {
          if (this.runtime.definition.capabilities.indexOf('component:setsource') === -1) {
            this.canComponent = false;
          }
        }
      },
      newGraph: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-graph');
        dialog.project = this.project.id;
        dialog.runtimes = this.runtimes;
        this.parentNode.parentNode.appendChild(dialog);
        dialog.addEventListener('new', function (event) {
          this.project.graphs.push(event.detail);
          this.fire('newgraph', event.detail);
        }.bind(this));
      },
      newComponent: function (event) {
        if (!this.canComponent) {
          return;
        }
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-component');
        dialog.project = this.project.id;
        this.parentNode.parentNode.appendChild(dialog);
        dialog.addEventListener('new', function (event) {
          this.project.components.push(event.detail);
          this.fire('newcomponent', event.detail);
        }.bind(this));
      },
      openHome: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'openHome');
        }
        this.$.account.toggleOpen(false);
        window.location.hash = '#';
      },
      openSettings: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'projectProperties');
        }
        var dialog = document.createElement('noflo-project-inspector');
        dialog.project = this.project;
        this.parentNode.parentNode.appendChild(dialog);
        dialog.addEventListener('updated', function (event) {
          Object.keys(event.detail).forEach(function (property) {
            this.project[property] = event.detail[property];
          }.bind(this));

          // Send only the data we actually want to store
          this.fire('changed', {
            id: this.project.id,
            name: this.project.name,
            repo: this.project.repo,
            type: this.project.type,
            main: this.project.main,
            graphs: [],
            components: []
          });
        }.bind(this));
      },
      openGraph: function (event, detail, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'openGraph');
        }
        this.$.account.toggleOpen(false);
        window.location.hash = '#project/' + this.project.id + '/' + sender.getAttribute('data-id');
      },
      openComponent: function (event, detail, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'openComponent');
        }
        this.$.account.toggleOpen(false);
        window.location.hash = '#project/' + this.project.id + '/component/' + sender.getAttribute('data-id');
      },
      upload: function (event) {
        event.preventDefault();
        if (!this.githubtoken) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'pushGithub');
        }
        var content;
        if (this.graph) {
          content = JSON.stringify(this.graph, null, 4);
        }
        if (this.component && !this.graph) {
          content = this.component.code;
        }
        this.fire('upload', {
          repo: this.project.repo,
          doc: this.graph || this.component,
          content: content,
          token: this.githubtoken,
          message: this.commitMessage
        });
        this.commitMessage = '';
      }
    });
  ;

    Polymer('noflo-component-editor', {
      component: null,
      width: null,
      height: null,
      codeEditor: null,
      testsEditor: null,
      theme: 'dark',
      componentChanged: function () {
        if (!this.component || !this.component.name) {
          this.style.display = 'none';
          return;
        }
        this.style.display = 'block';
        this.$.code_editor.innerHTML = '';

        if (!this.component.code) {
          this.component.code = this.getExampleCode();
        }

        this.codeEditor = CodeMirror(this.$.code_editor, {
          lineNumbers: true,
          value: this.component.code || '',
          mode: this.getMirrorMode(this.component.language),
          theme: this.getMirrorTheme(),
          readOnly: this.component.project ? false : true
        });
        this.codeEditor.on('change', function () {
          this.component.code = this.codeEditor.getValue();
          this.fire('changed', this.component);
        }.bind(this));
        this.$.tests_editor.innerHTML = '';
        this.testsEditor = CodeMirror(this.$.tests_editor, {
          lineNumbers: true,
          value: this.component.tests || '',
          mode: this.getMirrorMode(this.component.language),
          theme: this.getMirrorTheme(),
          readOnly: this.component.project ? false : true
        });
        this.testsEditor.on('change', function () {
          this.component.tests = this.testsEditor.getValue();
          this.fire('changed', this.component);
        }.bind(this));

        this.setSize();
      },
      widthChanged: function () {
        this.setSize();
      },
      heightChanged: function () {
        this.setSize();
      },
      getMirrorMode: function (language) {
        if (language === 'coffeescript' || language === 'javascript') {
          return language;
        } else if (language === 'c++') {
          return 'text/x-c++src';
        }
        return 'clike';
      },
      getMirrorTheme: function () {
        if (this.theme === 'light') {
          return 'mdn-like';
        }
        return 'noflo';
      },
      getExampleCode: function () {
        if (this.component.language === 'coffeescript') {
          return this.$.CoffeeScriptExample.innerText.trim();
        }
        if (this.component.language === 'javascript') {
          return this.$.JavaScriptExample.innerText.trim();
        }
      },
      themeChanged: function () {
        if (!this.codeEditor || !this.testsEditor) {
          return;
        }
        this.codeEditor.setOption('theme', this.getMirrorTheme());
        this.testsEditor.setOption('theme', this.getMirrorTheme());
      },
      setSize: function () {
        if (!this.codeEditor || !this.testsEditor || !this.width || !this.height) {
          return;
        }
        var width = (this.width - 80) / 2;
        var height = this.height - 82;
        this.codeEditor.setSize(width, height);
        this.testsEditor.setSize(width, height);
      }
    });
  ;

  (function () {
    "use strict";

    Polymer('the-graph-nav', {
      width: 200,
      height: 150,
      hide: false,
      thumbscale: 1,
      backgroundColor: "hsla(184, 8%, 75%, 0.9)",
      outsideFill: "hsla(0, 0%, 0%, 0.4)",
      ready: function () {
        this.viewrectangle = [0,0,500,500];
        this.scaledviewrectangle = [0,0,200,150];
        this.theme = "dark";
      },
      attached: function () {
        this.style.overflow = "hidden";
        this.style.cursor = "move";
        this.style.width = this.width + "px";
        this.style.height = this.height + "px";

        // Pan graph by dragging map
        this.addEventListener("track", function (event) {
          if (!this.editor) { return; }
          // Don't pan graph
          event.stopPropagation();

          var x = this.editor.pan[0];
          var y = this.editor.pan[1];
          var panscale = this.thumbscale / this.editor.scale;
          x -= event.ddx / panscale;
          y -= event.ddy / panscale;
          this.editor.pan = [Math.round(x), Math.round(y)];

          event.preventTap();
        }.bind(this));
        this.addEventListener("trackend", function (event) {
          // Don't pan graph
          event.stopPropagation();
        }.bind(this));

        // Tap to fit
        this.addEventListener("tap", function () {
          if (!this.editor) { return; }
          this.editor.triggerFit();
        });
      },
      observe: {
        'editor.scale': 'editorScaleChanged',
        'editor.width': 'editorWidthChanged',
        'editor.height': 'editorHeightChanged',
        'editor.pan': 'editorPanChanged',
        'editor.theme': 'editorThemeChanged'
      },
      editorChanged: function (oldEditor, newEditor) {
      },
      editorPanChanged: function () {
        if (!this.editor.pan) { return; }
        var x = this.editor.pan[0];
        var y = this.editor.pan[1];

        this.viewrectangle[0] = -x;
        this.viewrectangle[1] = -y;
      },
      editorWidthChanged: function () {
        this.viewrectangle[2] = parseInt(this.editor.width, 10);
      },
      editorHeightChanged: function () {
        this.viewrectangle[3] = parseInt(this.editor.height, 10);
      },
      editorScaleChanged: function () {
        this.scale = this.editor.scale;
      },
      editorThemeChanged: function () {
        if (this.editor.theme === "dark") {
          this.viewBoxBorder =  "hsla(190, 100%, 80%, 0.4)";
          this.viewBoxBorder2 = "hsla( 10,  60%, 32%, 0.3)";
          this.outsideFill = "hsla(0, 0%, 0%, 0.4)";
          this.backgroundColor = "hsla(0, 0%, 0%, 0.9)";
        } else {
          this.viewBoxBorder =  "hsla(190, 100%, 20%, 0.8)";
          this.viewBoxBorder2 = "hsla( 10,  60%, 80%, 0.8)";
          this.outsideFill = "hsla(0, 0%, 100%, 0.4)";
          this.backgroundColor = "hsla(0, 0%, 100%, 0.9)";
        }
        this.style.backgroundColor = this.backgroundColor;
        // Redraw rectangle
        this.viewrectangleChanged();
      },
      viewrectangleChanged: function () {
        // Canvas to grey out outside view
        var context = this.$.outcanvas.getContext('2d');
        context = unwrap(context);
        context.clearRect(0, 0, this.width, this.height);
        context.fillStyle = this.outsideFill;

        // Scaled view rectangle
        var x = Math.round( (this.viewrectangle[0]/this.scale - this.thumbrectangle[0]) * this.thumbscale );
        var y = Math.round( (this.viewrectangle[1]/this.scale - this.thumbrectangle[1]) * this.thumbscale );
        var w = Math.round( this.viewrectangle[2] * this.thumbscale / this.scale );
        var h = Math.round( this.viewrectangle[3] * this.thumbscale / this.scale );

        if (x<0 && y<0 && w>this.width-x && h>this.height-y) {
          // Hide map
          this.hide = true;
          return;
        } else {
          // Show map
          this.hide = false;
        }

        // Clip to bounds
        // Left
        if (x < 0) { 
          w += x; 
          x = 0;
          this.$.viewrect.style.borderLeftColor = this.viewBoxBorder2;
        } else {
          this.$.viewrect.style.borderLeftColor = this.viewBoxBorder;
          context.fillRect(0, 0, x, this.height);
        }
        // Top
        if (y < 0) { 
          h += y; 
          y = 0;
          this.$.viewrect.style.borderTopColor = this.viewBoxBorder2;
        } else {
          this.$.viewrect.style.borderTopColor = this.viewBoxBorder;
          context.fillRect(x, 0, w, y);
        }
        // Right
        if (w > this.width-x) { 
          w = this.width-x;
          this.$.viewrect.style.borderRightColor = this.viewBoxBorder2;
        } else {
          this.$.viewrect.style.borderRightColor = this.viewBoxBorder;
          context.fillRect(x+w, 0, this.width-(x+w), this.height);
        }
        // Bottom
        if (h > this.height-y) { 
          h = this.height-y;
          this.$.viewrect.style.borderBottomColor = this.viewBoxBorder2;
        } else {
          this.$.viewrect.style.borderBottomColor = this.viewBoxBorder;
          context.fillRect(x, y+h, w, this.height-(y+h));
        }

        // Size and translate rect
        this.$.viewrect.style.left = x+"px";
        this.$.viewrect.style.top = y+"px";
        this.$.viewrect.style.width = w+"px";
        this.$.viewrect.style.height = h+"px";
        // this.scaledviewrectangle = [x, y, w, h];
      },
      hideChanged: function () {
        if (this.hide) {
          this.style.display = "none";
        } else {
          this.style.display = "block";
        }
      },
      thumbscaleChanged: function () {
        this.viewrectangleChanged();
      },
      thumbrectangleChanged: function () {
        // Binding this from the-graph-thumb to know the dimensions rendered
        var w = this.thumbrectangle[2];
        var h = this.thumbrectangle[3];
        this.thumbscale = (w>h) ? this.width/w : this.height/h;
      }
    });

  })();
  ;

    Polymer('noflo-journal', {
      db: null,
      graph: null,
      editor: null,
      returnTo: null,
      klay: false,
      hidenav: false,
      canUndo: false,
      canRedo: false,
      enteredView: function () {
        if (typeof window.$klay !== 'undefined') {
          this.klay = true;
        }
      },
      graphChanged: function () {
        this.checkState();
        if (!this.graph) {
          return;
        }
        if (!this.graph.properties.project || this.graph.journal) {
          return;
        }

        // Initialize persistent journal whenever needed
        var noflo = require('noflo');
        var IDBJournalStore = require('noflo-ui/src/JournalStore').IDBJournalStore;
        var store = new IDBJournalStore(this.graph, this.db);
        store.init(function () {
          this.graph.journal = new noflo.Journal(this.graph, undefined, store);
          this.checkState();
          this.graph.journal.store.on('transaction', function () {
            this.checkState();
          }.bind(this));
        }.bind(this));
      },
      checkState: function () {
        if (!this.graph || !this.graph.journal) {
          this.canUndo = false;
          this.canRedo = false;
          return;
        }
        this.canUndo = this.graph.journal.canUndo();
        this.canRedo = this.graph.journal.canRedo();
      },
      undo: function (event, data, sender) {
        if (event) {
          event.preventDefault();
        }
        if (!this.graph || !this.graph.journal) {
          return;
        }
        this.graph.journal.undo();
        this.checkState();
      },
      redo: function (event, data, sender) {
        if (event) {
          event.preventDefault();
        }
        if (!this.graph || !this.graph.journal) {
          return;
        }
        this.graph.journal.redo();
        this.checkState();
      },
      autolayout: function (event, data, sender) {
        event.preventDefault();
        if (!this.graph || !this.klay) {
          return;
        }
        var graph = document.getElementById("graph");
        graph.triggerAutolayout();
      },
      hidenavChanged: function () {
        if (this.hidenav) {
          this.$.controls.style.height = "36px";
        } else {
          this.$.controls.style.height = "180px";
        }
      }
    });
  ;

    Polymer('noflo-help', {
      visible: false,
      headline: '',
      text: '',
      enteredView: function () {
        this.visibleChanged();
        this.addEventListener('click', function (event) {
          if (unwrap(event).target.tagName === 'A') {
            return;
          }
          event.preventDefault();
          this.visible = false;
        }.bind(this), false);
      },
      show: function (headline, text) {
        this.headline = headline;
        this.text = text;
        this.open();
      },
      open: function () {
        this.visible = true;
      },
      close: function () {
        this.visible = false;
      },
      visibleChanged: function () {
        if (this.visible) {
          this.style.bottom = '0px';
        } else {
          this.style.bottom = '-' + (this.offsetHeight + 2) + 'px';
        }
      },
      textChanged: function () {
        this.$['help-text'].innerHTML = this.text;
      }
    });
  