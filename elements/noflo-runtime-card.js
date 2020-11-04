import { PolymerElement, html } from '@polymer/polymer';
import runtimeInfo from '../runtimeinfo';
import './noflo-card-styles';
import './noflo-icon';

class NoFloRuntimeCard extends PolymerElement {
  static get template() {
    return html`
    <style include="noflo-card-styles">
    #runtimeicon {
      font-size: 72px;
      position: absolute;
      right: -8px;
      top: 9px;
      color: hsla(185, 100%, 75%, 0.2);
      text-decoration: none;
    }
    </style>
    <noflo-icon id="runtimeicon" icon="[[getRuntimeIcon(runtime)]]"></noflo-icon>
    <button id="menubutton" title="Runtime menu" on-click="toggleMenu"><noflo-icon icon="[[menuicon]]"></noflo-icon></button>
    <template is="dom-if" if="[[menuopen]]">
    <ul id="menu">
      <li><button on-click="deleteRuntime">Delete runtime</button></li>
    </ul>
    </template>
    <h2>[[runtime.label]]</h2>
    <p><span>[[_produceAddress(runtime)]]</span>. Seen <span>[[runtime.seenHoursAgo]]</span>h ago</p>
`;
  }

  static get is() {
    return 'noflo-runtime-card';
  }

  static get properties() {
    return {
      menuopen: {
        type: Boolean,
        value: false,
        observer: '_menuOpenChanged',
      },
      menuicon: {
        type: String,
        value: 'ellipsis-v',
      },
      runtime: {
        type: Object,
        value() {
          return {};
        },
      },
    };
  }

  toggleMenu(event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.menuopen) {
      this.menuopen = false;
      return;
    }
    this.menuopen = true;
  }

  deleteRuntime(event) {
    event.stopPropagation();
    event.preventDefault();
    this.dispatchEvent(new CustomEvent('deleteRuntime', {
      detail: this.runtime,
      composed: true,
      bubbles: true,
    }));
    this.menuopen = false;
  }

  getRuntimeIcon(runtime) {
    if (!runtime || !runtime.type || !runtimeInfo[runtime.type]) {
      return 'cog';
    }
    let icon = 'cog';
    Object.keys(runtimeInfo).forEach((name) => {
      Object.keys(runtimeInfo[name].runtimetypes).forEach((runtimeType) => {
        if (runtimeType !== runtime.type) {
          return;
        }
        icon = runtimeInfo[name].runtimetypes[runtime.type].icon;
      });
    });
    return icon;
  }

  _produceAddress(runtime) {
    if (runtime.protocol === 'webrtc') {
      return `WebRTC P2P ${runtime.id}`;
    }
    return runtime.address;
  }

  _menuOpenChanged() {
    if (this.menuopen) {
      this.menuicon = 'caret-down';
      return;
    }
    this.menuicon = 'ellipsis-v';
  }
}
customElements.define(NoFloRuntimeCard.is, NoFloRuntimeCard);
