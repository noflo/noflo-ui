import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import runtimeInfo from '../runtimeinfo';
import './noflo-icon';

Polymer({
  _template: html`
    <style>
      :host {
        top: calc(50% - 220px) !important;
      }
      ul.types {
        padding: 0px;
        margin: 0px;
        margin-left: -9px;
        margin-right: -9px;
        list-style: none;
      }
      ul.types li {
        width: 274px;
        height: 105px;
        overflow: hidden;
        display: inline-block;
        text-align: center;
        background-color: hsl(192, 25%, 75%);
        color: hsl(189, 50%, 80%);
        border-radius: 3px;
        margin-right: 9px;
        margin-left: 9px;
        margin-bottom: 18px;
        position: relative;
        cursor: pointer;
        transition: background-color 0.3s ease-in-out;
      }
      ul.types li.selected,
      ul.types li:hover {
        background-color: hsl(190, 100%, 30%);
        color: white;
        cursor: default;
      }
      ul.types li.selected p {
        color: hsl(0, 0%, 80%);
      }
      ul.types li h2 {
        position: absolute;
        top: 36px;
        line-height: 36px;
        width: 180px;
        text-transform: none;
        font-size: 10px;
        text-align: left;
        white-space: nowrap;
        left: 18px;
        padding: 0px;
        margin: 0px;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      ul.types li p {
        position: absolute;
        top: 53px;
        left: 18px;
        width: 180px;
        text-transform: uppercase;
        font-size: 8px;
        text-align: left;
        max-height: 36px;
        overflow: hidden;
        color: hsl(189, 50%, 80%);
      }
      ul.types li noflo-icon {
        font-size: 72px;
        position: absolute;
        right: -8px;
        top: 9px;
      }
    </style>
    <ul class="types">
      <template is="dom-repeat" items="{{available}}" as="availtype">
      <li on-click="selectType" data-id\$="{{availtype.id}}" class\$="{{_computeClass(availtype, type)}}">
        <h2>{{availtype.label}}</h2>
        <noflo-icon icon="{{availtype.icon}}"></noflo-icon>
        <template is="dom-if" if="{{_computeIf(availtype)}}">
        <p><span>{{availtype.runtimes.length}}</span> runtime</p>
        </template>
        <template is="dom-if" if="{{_computeIf2(availtype)}}">
        <p><span>{{availtype.runtimes.length}}</span> runtimes</p>
        </template>
      </li>
      </template>
    </ul>
`,

  is: 'noflo-type-selector',

  properties: {
    available: {
      type: Array,
      value() {
        return [];
      },
    },
    runtimes: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'runtimesChanged',
    },
    type: {
      type: String,
      value: 'noflo-nodejs',
      notify: true,
    },
  },

  runtimesChanged() {
    this.available = [{
      id: 'all',
      label: 'Multi-platform',
      icon: 'asterisk',
      runtimes: [],
    }];
    if (!this.runtimes) {
      return;
    }
    this.runtimes.forEach((rt) => {
      if (!rt.type) {
        return;
      }
      const availType = this.getByType(rt.type);
      availType.runtimes.push(rt);
    });
  },

  selectType(event) {
    this.type = event.currentTarget.getAttribute('data-id');
  },

  getByType(type) {
    for (let i = 0; i < this.available.length; i += 1) {
      if (this.available[i].id === type) {
        return this.available[i];
      }
    }
    return this.prepareAvailable(type);
  },

  prepareAvailable(type) {
    const runtimeTypeInfo = {};
    Object.keys(runtimeInfo).forEach((name) => {
      const info = runtimeInfo[name];
      Object.keys(info.runtimetypes).forEach((runtimeType) => {
        runtimeTypeInfo[runtimeType] = info.runtimetypes[runtimeType];
      });
    });
    // Also unknown runtimes should show up, synthesize info using defaults
    const availType = {
      id: type,
      label: type,
      icon: 'cogs',
      runtimes: [],
    };
    const info = runtimeTypeInfo[type];
    if (info && info.icon) {
      availType.icon = info.icon;
    }
    if (info && info.shortname) {
      availType.label = info.shortname;
    }
    this.push('available', availType);
    return availType;
  },

  _computeClass(availtype, type) {
    return this.tokenList({ selected: type === availtype.id });
  },

  _computeIf(availtype) {
    return availtype.runtimes.length === 1;
  },

  _computeIf2(availtype) {
    return availtype.runtimes.length > 1;
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
