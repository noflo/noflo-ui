import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Published <span>{{direction}}</span> port <span>{{publicport}}</span></h1>
      <form>
        <label>
          Port name
          <input type="text" value="{{name::input}}" required="">
        </label>
        <div class="toolbar">
          <button on-click="send" class\$="{{_computeClass(canSend)}}">Rename</button>
          <a on-click="close">Cancel</a>
        </div>
      </form>
    </div>
`,

  is: 'noflo-exported-inspector',

  properties: {
    canSend: {
      type: Boolean,
      value: false,
    },
    direction: {
      type: String,
      value: 'input',
      notify: true,
    },
    graph: {
      value: null,
      notify: true,
    },
    name: {
      type: String,
      value: '',
      observer: 'nameChanged',
    },
    privateport: {
      value: null,
      notify: true,
    },
    publicport: {
      type: String,
      value: '',
      notify: true,
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
    this.name = this.publicport;
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  nameChanged() {
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

  send(event) {
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
