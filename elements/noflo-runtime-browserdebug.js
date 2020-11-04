import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import { v4 as uuid } from 'uuid';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      #runtimeLink {
        width: 100%;
      }
      #qrcode {
        width: 300px;
        height: 300px;
      }
      .info {
        clear: both;
      }
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Launch noflo-browser device</h1>
      <label>
        <span>Base application</span>
        <input type="text" value="{{baseApp::input}}" on-change="generateRuntimeInfo">
      </label>
      <div class="info">
        <div><a id="runtimeLink" href\$="{{runtimeUrl}}">Launch</a></div>
        <div><img id="qrcode" src="{{qrCodeUrl}}"></div>
      </div>
      <div class="toolbar">
        <button on-click="close">Cancel</button>
        <button on-click="connectRuntime">Connect</button>
      </div>
    </div>
`,

  is: 'noflo-runtime-browserdebug',

  properties: {
    baseApp: {
      type: String,
      value: 'https://noflojs.org/noflo-browser-app/main.html',
    },
    graph: { notify: true },
    qrCodeUrl: {
      type: String,
      value: '',
    },
    runtime: {
      type: Object,
      value() {
        return {};
      },
    },
    runtimeUrl: {
      type: String,
      value: '',
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
    this.generateRuntimeInfo();
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  generateRuntimeInfo() {
    const signaller = 'https://api.flowhub.io';
    const id = uuid();
    const address = `${signaller}#${id}`;
    const params = `?fbp_noload=true&fbp_protocol=webrtc&fbp_address=${encodeURIComponent(address)}`;
    const runtime = {
      id,
      seenHoursAgo: 1,
      user: '3f3a8187-0931-4611-8963-239c0dff1931',
      // FIXME: correct
      secret: 'my-super-secret',
      // FIXME: correct
      label: 'noflo-browser live debug',
      description: 'On device debugging project',
      graph: this.graph.properties.id,
      protocol: 'webrtc',
      type: 'noflo-browser',
      address,
    };
    this.runtime = runtime;
    const appDebugUrl = this.baseApp + params;
    const qrBase = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=';
    this.qrCodeUrl = qrBase + encodeURIComponent(appDebugUrl);
    this.runtimeUrl = appDebugUrl;
  },

  bgClick(event) {
    // Don't close if clicking within container
    event.stopPropagation();
  },

  connectRuntime() {
    this.fire('runtime', this.runtime);
    this.close();
  },

  close() {
    if (!PolymerDom(this).parentNode) {
      return;
    }
    PolymerDom(PolymerDom(this).parentNode).removeChild(this);
  },

  listeners: { click: 'close' },
});
