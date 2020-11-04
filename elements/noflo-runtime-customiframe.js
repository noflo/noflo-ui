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
      <h1>Open noflo-browser runtime in preview area</h1>
      <label>
        <span>Base application</span>
        <input type="url" value="{{runtimeUrl::input}}" on-change="generateRuntimeInfo">
      </label>
      <div class="toolbar">
        <button on-click="close">Cancel</button>
        <button on-click="connectRuntime">Connect</button>
      </div>
    </div>
`,

  is: 'noflo-runtime-customiframe',

  properties: {
    graph: { notify: true },
    runtime: {
      type: Object,
      value() {
        return {};
      },
    },
    runtimeUrl: {
      type: String,
      value: 'https://noflojs.org/noflo-browser/everything.html',
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
    const id = uuid();
    // TODO: make a hash of the URL instead??
    const params = '?fbp_noload=true&fbp_protocol=iframe';
    const address = this.runtimeUrl + params;
    const runtime = {
      id,
      seenHoursAgo: 1,
      user: '3f3a8187-0931-4611-8963-239c0dff1932',
      // FIXME: correct
      label: 'noflo-browser iframe',
      description: 'running in iframe',
      graph: this.graph.properties.id,
      protocol: 'iframe',
      type: 'noflo-browser',
      address,
    };
    this.runtime = runtime;
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
