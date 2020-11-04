import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import noflo from 'noflo';
import './noflo-type-selector';
import './noflo-icon-selector';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Create new graph</h1>
      <form>
        <div class="modal-content">
        <label>
          Graph name
          <input type="text" value="{{name::input}}" placeholder="MyCoolGraph" required="">
        </label>
        <label>
          Graph type
          <select name="type" value="{{mainGraph::input}}">
            <option value="true" selected\$="[[_isSelectedMainGraph('true', mainGraph)]]">Main graph</option>
            <option value="false" selected\$="[[_isSelectedMainGraph('false', mainGraph)]]">Subgraph</option>
          </select>
        </label>
        <label>
          Graph description
          <input type="text" value="{{description::input}}" placeholder="Do something interesting">
        </label>
        <label>
          Runtime
          <noflo-type-selector type="{{type}}" runtimes="{{runtimes}}"></noflo-type-selector>
        </label>
        <label>
          Icon
          <noflo-icon-selector selected="{{icon}}"></noflo-icon-selector>
        </label>
        </div>
        <div class="toolbar">
          <button on-click="send" class\$="{{_computeClass(canSend)}}">Create</button>
          <a on-click="close">Cancel</a>
        </div>
      </form></div>
`,

  is: 'noflo-new-graph',

  properties: {
    canSend: {
      type: Boolean,
      value: false,
    },
    name: {
      type: String,
      value: '',
      observer: 'nameChanged',
    },
    description: {
      type: String,
      value: '',
    },
    mainGraph: {
      type: String,
      value: 'true',
    },
    project: {
      type: Object,
      value() {
        return {};
      },
      notify: true,
    },
    runtimes: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    type: {
      type: String,
      value: 'noflo-browser',
    },
    icon: {
      type: String,
      value: 'cog',
      notify: true,
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  nameChanged() {
    let duplicates = [];
    if (this.project) {
      if (!this.project.graphs || !this.project.components) {
        return;
      }
      duplicates = this.project.graphs.filter((graph) => {
        if (graph.name === this.name) {
          return true;
        }
        return false;
      });
      duplicates = duplicates.concat(this.project.components.filter((component) => {
        if (component.name === this.name) {
          return true;
        }
        return false;
      }));
    }
    if (this.name && this.project && !duplicates.length) {
      this.canSend = true;
    } else {
      this.canSend = false;
    }
  },

  send(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.name) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'newGraph');
    }
    const graph = new noflo.Graph(this.name);
    graph.setProperties({
      description: this.description,
      project: this.project.id,
      id: `${this.project.id}/${this.name}`,
      icon: this.icon,
      main: (this.mainGraph === 'true'),
      environment: { type: this.type },
    });
    this.fire('new', graph);
    this.close();
  },

  bgClick(event) {
    // Don't close if clicking within container
    event.stopPropagation();
  },

  close() {
    if (!PolymerDom(this).parentNode) {
      return;
    }
    PolymerDom(PolymerDom(this).parentNode).removeChild(this);
  },

  listeners: { click: 'close' },

  _computeClass(canSend) {
    return this.tokenList({ disabled: !canSend });
  },

  _isSelectedMainGraph(value, current) {
    return value === current;
  },

  tokenList(obj) {
    const pieces = [];
    Object.keys(obj).forEach((key) => {
      if (obj[key]) {
        pieces.push(key);
      }
    });
    return pieces.join(' ');
  },
});
