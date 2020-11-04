import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import runtimelib from '../src/runtime';
import './noflo-runtime-browserdebug';
import './noflo-runtime-customiframe';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      ul.runtimes {
        padding: 0px;
        margin-left: -9px;
        margin-right: -9px;
        list-style: none;
        margin-top: 18px;
        margin-bottom: 18px;
      }
      ul.runtimes li {
        width: 274px;
        height: 105px;
        overflow: hidden;
        display: inline-block;
        text-align: center;
        background-color: hsl(192, 25%, 60%);
        color: white;
        transition: background-color 0.3s ease-in-out;
        border-radius: 3px;
        margin-right: 9px;
        margin-left: 9px;
        margin-bottom: 18px;
        position: relative;
        cursor: pointer;
      }
      ul.runtimes li.selected,
      ul.runtimes li:hover {
        background-color: hsl(190, 100%, 30%);
        color: white;
        cursor: default;
      }
      ul.runtimes li h2 {
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
      ul.runtimes li p {
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
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Select runtime for <span>{{graph.name}}</span></h1>
      <template is="dom-if" if="{{available.length}}">
        <ul class="runtimes modal-content">
          <template is="dom-repeat" items="{{available}}" as="runtime">
          <li on-click="selectRuntime" data-id\$="{{runtime.id}}" class\$="{{runtime.type}}">
            <h2>{{runtime.label}}</h2>
            <p><span>{{runtime.address}}</span>.<br>Seen <span>{{runtime.seenHoursAgo}}</span>h ago</p>
          </li>
          </template>
        </ul>
      </template>
      <template is="dom-if" if="{{!available.length}}">
        <p>No compatible runtimes available.</p>
      </template>
      <div class="toolbar">
        <button on-click="close">Cancel</button>
      </div>
    </div>
`,

  is: 'noflo-runtime-selector',

  properties: {
    available: {
      type: Array,
      value() {
        return [];
      },
    },
    graph: { notify: true },
    component: { notify: true },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
    let type;
    if (this.component) {
      type = runtimelib.getComponentType(this.component);
    }
    if (this.graph) {
      type = runtimelib.getGraphType(this.graph);
    }
    if (!type) {
      type = 'all';
    }
    // Insert button to launch new runtime for noflo-browser
    const launchNewBrowserRuntime = {
      id: 'new-browser-runtime',
      label: 'Launch new runtime',
      address: 'WebRTC',
    };
    const customIframeRuntime = {
      id: 'custom-iframe-address',
      label: 'Custom iframe URL',
      address: 'myapp.html',
    };
    const launchImgfloHerokuRuntime = {
      id: 'imgflo-heroku-new',
      label: 'New imgflo app on Heroku',
      address: 'myapp.herokuapps.com',
    };
    if (type === 'noflo-browser') {
      this.push('available', launchNewBrowserRuntime);
      this.push('available', customIframeRuntime);
    }
    if (type === 'imgflo') {
      this.push('available', launchImgfloHerokuRuntime);
    }
    this.runtimes.forEach((rt) => {
      this.push('available', rt);
    });
    this.available.forEach(this.checkRuntimeSeen.bind(this));
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  // similiar to in noflo-main.html
  checkRuntimeSeen(runtime) {
    if (!runtime.seen) {
      // eslint-disable-next-line no-param-reassign
      runtime.seen = Date.now();
    }
    // eslint-disable-next-line no-param-reassign
    runtime.seenHoursAgo = Math.floor(
      (Date.now() - new Date(runtime.seen).getTime()) / (60 * 60 * 1000),
    );
    if (runtime.seenHoursAgo / 24 > 31) {
      // We haven't seen this runtime in over a month, don't show it
      const index = this.available.indexOf(runtime);
      this.splice('available', index, 1);
    }
  },

  selectRuntime(event) {
    const id = event.currentTarget.getAttribute('data-id');
    if (id === 'new-browser-runtime') {
      // Launch new runtime instead of connect to existing
      this.close();
      this.debugOnDevice();
      return;
    } if (id === 'custom-iframe-address') {
      // Add new iframe runtime for given address
      this.close();
      this.addIframeRuntime();
      return;
    } if (id === 'imgflo-heroku-new') {
      this.close();
      this.deployHeroku('https://github.com/jonnor/imgflo');
    }
    this.runtimes.forEach((runtime) => {
      if (runtime.id === id) {
        this.fire('runtime', runtime);
        this.close();
      }
    });
  },

  debugOnDevice() {
    this.debugOnDeviceModal = document.createElement('noflo-runtime-browserdebug');
    this.set('debugOnDeviceModal.graph', this.graph);
    this.debugOnDeviceModal.addEventListener('runtime', (event) => {
      const runtime = event.detail;
      this.fire('runtime', runtime);
    });
    PolymerDom(document.body).appendChild(this.debugOnDeviceModal);
  },

  addIframeRuntime() {
    this.addIframeModal = document.createElement('noflo-runtime-customiframe');
    this.set('addIframeModal.graph', this.graph);
    this.addIframeModal.addEventListener('runtime', (event) => {
      const runtime = event.detail;
      this.fire('runtime', runtime);
    });
    PolymerDom(document.body).appendChild(this.addIframeModal);
  },

  deployHeroku(template) {
    // Send user over to Heroku
    // The deployed runtime will then have a link which takes them back to Flowhub
    // TODO: inform the user about this process
    const baseUrl = 'https://dashboard.heroku.com/new?template=';
    document.location.href = baseUrl + encodeURIComponent(template);
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
