import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import { v4 as uuid } from 'uuid';
import './noflo-type-selector';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Create new project</h1>
      <form>
        <div class="modal-content">
        <label>
          Project label
          <input type="text" value="{{name::input}}" placeholder="My Cool Project" required="">
        </label>
        <label>
          Project namespace
          <input type="text" value="{{namespace::input}}" placeholder="my-project" autocapitalize="off" autocorrect="off" readonly="">
        </label>
        <label>
          Primary Type
          <noflo-type-selector type="{{type}}" runtimes="{{runtimes}}"></noflo-type-selector>
        </label>
        </div>
        <div class="toolbar">
          <button on-click="send" class\$="{{_computeClass(canSend)}}">Create</button>
          <a on-click="close">Cancel</a>
        </div>
      </form></div>
`,

  is: 'noflo-new-project',

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
    namespace: {
      type: String,
      value: '',
    },
    projectId: {
      type: String,
      value: '',
    },
    projects: { value: null },
    runtimes: {
      value: null,
      notify: true,
    },
    type: {
      type: String,
      value: 'noflo-browser',
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  produceNamespace(namespace) {
    return namespace.toLowerCase().replace(/[\s/._]/g, '-').replace('--', '-').replace(/[^a-z0-9-]/g, '');
  },

  nameChanged() {
    this.namespace = this.produceNamespace(this.name);
    this.projectId = uuid();
    if (this.name && this.namespace && this.projectId) {
      this.canSend = true;
    } else {
      this.canSend = false;
    }
  },

  send(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.name || !this.namespace || !this.projectId) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'newProject');
    }
    this.fire('new', {
      id: this.projectId,
      name: this.name,
      namespace: this.produceNamespace(this.namespace),
      type: this.type,
      graphs: [],
      components: [],
      specs: [],
    });
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
