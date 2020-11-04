import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import { v4 as uuid } from 'uuid';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      :host {
        display: block;
      }
      a {
        color: hsl(190, 100%, 30%);
      }
      p {
        font-size: 11px;
      }
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Add new runtime</h1>
      <form>
        <div class="modal-content">
        <label>
          Runtime name 
          <input type="text" value="{{name::input}}" placeholder="New local runtime" required="">
        </label>
        <label>
          IP address
          <input type="text" value="{{address::input}}" placeholder="127.0.0.1" required="">
        </label>
        <label>
          Port
          <input type="text" data-type="int" value="{{port::input}}" placeholder="3569" required="">
        </label>
        <label>
          Type
          <select id="type" value="{{type::input}}">
            <template is="dom-repeat" items="{{availableTypes}}" as="type">
            <option value="{{type}}">{{type}}</option>
            </template>
          </select>
        </label>
        <label>
          Secret
          <input type="text" value="{{secret::input}}" placeholder="secret-string" required="">
        </label>
        </div>
        <div class="toolbar">
          <button on-click="create" class\$="{{_computeClass(canCreate)}}">Create</button>
          <a on-click="close">Cancel</a>
        </div>
      </form>
    </div>
`,

  is: 'noflo-add-runtime',

  properties: {
    address: {
      type: String,
      value: 'localhost',
      observer: 'validate',
    },
    availableTypes: {
      type: Array,
      value() {
        return [
          '',
          'custom',
          'noflo-nodejs',
          'microflo',
          'javafbp',
          'imgflo',
          'sndflo',
          'msgflo',
        ];
      },
    },
    canCreate: {
      type: Boolean,
      value: false,
    },
    name: {
      type: String,
      value: '',
      observer: 'validate',
    },
    port: {
      type: String,
      value: '3569',
      observer: 'validate',
    },
    secret: {
      type: String,
      value: '',
    },
    type: {
      type: String,
      value: '',
      observer: 'validate',
    },
  },

  attached() {
    // PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
  },

  detached() {
    // PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  bgClick(event) {
    // Don't close if clicking within container
    event.stopPropagation();
  },

  validate() {
    if (this.name && this.address && this.port && this.type) {
      this.canCreate = true;
    }
  },

  close() {
    if (!PolymerDom(this).parentNode) {
      return;
    }
    PolymerDom(PolymerDom(this).parentNode).removeChild(this);
  },

  createUUID() {
    return uuid();
  },

  create(event) {
    if (event) {
      event.preventDefault();
    }
    const runtime = {
      name: this.name,
      label: this.name,
      id: this.createUUID(),
      type: this.type,
      seen: new Date().toString(),
      protocol: 'websocket',
      address: `ws://${this.address}:${this.port}`,
      description: '',
      secret: this.secret,
      icon: 'cloud',
    };
    this.fire('new', runtime);
    this.close();
  },

  listeners: { click: 'close' },

  _computeRepeat(availableTypes, t) {
    return t in availableTypes;
  },

  _computeClass(canCreate) {
    return this.tokenList({ disabled: !canCreate });
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
