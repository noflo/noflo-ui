import { Polymer } from '@polymer/polymer/polymer-legacy';

Polymer({
  is: 'noflo-library',
  properties: {
    editor: {
      value: null,
      notify: true,
    },
    graphs: {
      type: Array,
      value() {
        return [];
      },
    },
    project: { value: null },
    search: {
      value: null,
      observer: 'searchChanged',
    },
  },
  addNode(component) {
    const componentName = component.name;
    let num = 60466176;
    // 36^5
    num = Math.floor(Math.random() * num);
    const id = `${componentName}_${num.toString(36)}`;
    // TODO fix with pan
    const pan = this.editor.$.graph.getPan();
    const scale = this.editor.$.graph.getScale();
    const { graph } = this.editor;
    graph.startTransaction('addnode');
    const nameParts = componentName.split('/');
    graph.addNode(id, componentName, {
      label: nameParts[nameParts.length - 1],
      x: Math.floor((-pan[0] + 334) / scale),
      y: Math.floor((-pan[1] + 100) / scale),
    });
    // Add IIPs for default values
    component.inports.forEach((port) => {
      const value = port.default;
      if (value !== undefined) {
        graph.addInitial(value, id, port.name);
      }
    });
    graph.endTransaction('addnode');
  },
  searchChanged() {
    if (typeof this.search !== 'string') {
      return;
    }
    if (!this.editor) {
      return;
    }
    const library = this.editor.getLibrary();
    if (!library) {
      return;
    }
    const search = this.search.toLowerCase();
    const components = Object.keys(library).map((name) => this.editor.getComponent(name));
    const matching = components.filter((component) => {
      if (component.unnamespaced) {
        // Skip the non-namespaced variants from results
        return false;
      }
      // First find all components matching the search
      if (search === '') {
        // Empty search, all components match
        return true;
      }
      if (component.name.toLowerCase().indexOf(search) !== -1) {
        // Component name matches
        return true;
      }
      if (typeof component.description === 'string' && component.description.toLowerCase().indexOf(search) !== -1) {
        // Component description matches
        return true;
      }
      return false;
    }).filter((component) => {
      // Then filter out components we're not supposed to use
      if (!component.subgraph) {
        // Elementary components can always be used
        return true;
      }
      const nameParts = component.name.split('/');
      if (nameParts[0] === this.project.id || nameParts[0] === this.project.namespace) {
        for (let i = 0; i < this.graphs.length; i += 1) {
          if (this.graphs[i].name === nameParts[1]
            || this.graphs[i].properties.id === nameParts[1]) {
            // Prevent circular dependencies
            return false;
          }
        }
      }
      return true;
    });
    // timeout required because events fired by polymer that are received
    // by graph router need to clean up before the graph receives another event
    window.setTimeout(() => {
      const addNode = this.addNode.bind(this);
      this.fire('result', matching.map((component) => ({
        label: component.name,
        icon: component.icon || 'cog',
        description: component.description,
        action() {
          addNode(component);
        },
      })));
    }, 0);
  },
});
