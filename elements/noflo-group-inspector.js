import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>
        <template is="dom-if" if="{{group}}">
        <span>{{group}}</span>
        </template>
        <template is="dom-if" if="{{!group}}">
        New
        </template>
        group containing <span>{{nodes.length}}</span> nodes
      </h1>
      <form>
        <label>
          Group name
          <input type="text" value="{{name::input}}" placeholder="processing" required="">
        </label>
        <label>
          Group description
          <input type="text" value="{{description::input}}" placeholder="The nodes that process things" required="">
        </label>
        <div class="toolbar">
          <button on-click="send">
            <template is="dom-if" if="{{group}}">
            Rename
            </template>
            <template is="dom-if" if="{{!group}}">
            Create
            </template>
          </button>
          <a on-click="close">Cancel</a>
        </div>
      </form>
    </div>
`,

  is: 'noflo-group-inspector',

  properties: {
    description: {
      type: String,
      value: '',
    },
    graph: {
      value: null,
      notify: true,
    },
    group: {
      type: String,
      value: '',
      notify: true,
    },
    groupdescription: {
      type: String,
      value: '',
      notify: true,
    },
    name: {
      type: String,
      value: '',
    },
    nodes: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
    this.name = this.group;
    this.description = this.groupdescription;
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  send(event) {
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
        this.graph.setGroupMetadata(this.group, { description: this.description });
      }
    } else {
      this.graph.addGroup(this.name, this.nodes, { description: this.description });
    }
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
});
