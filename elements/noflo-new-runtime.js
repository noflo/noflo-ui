import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import runtimeInfo from '../runtimeinfo';
import './noflo-add-runtime';
import './noflo-icon';
import './noflo-modal-styles';

const runtimes = [];

const runtimeTypes = {};
Object.keys(runtimeInfo).forEach((name) => {
  const rtInfo = runtimeInfo[name];
  Object.keys(rtInfo.runtimetypes).forEach((runtimeType) => {
    const info = rtInfo.runtimetypes[runtimeType];
    const def = {
      name: runtimeType,
      label: info.shortname,
      icon: info.icon,
      description: info.description,
      url: info.helpurl,
    };
    if (!runtimeTypes[runtimeType]) {
      // Avoid duplicates
      runtimeTypes[runtimeType] = def;
      runtimes.push(def);
    }
  });
});
Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      a {
        color: hsl(190, 100%, 30%);
      }
      p {
        font-size: 11px;
      }
      ul.runtimes {
        padding: 0px;
        margin: 0px;
        margin-left: -10px;
        margin-right: -10px;
        list-style: none;
      }
      ul.runtimes li {
        display: inline-block;
      }
      ul.runtimes li a {
        width: 274px;
        height: 105px;
        overflow: hidden;
        display: inline-block;
        text-align: center;
        background-color: hsl(190, 100%, 30%);
        color: white;
        border-radius: 3px;
        margin-right: 9px;
        margin-left: 9px;
        margin-bottom: 18px;
        position: relative;
        cursor: pointer;
        text-decoration: none;
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
        text-decoration: none;
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
        text-decoration: none;
      }
      ul.runtimes li a noflo-icon {
        font-size: 72px;
        position: absolute;
        right: -8px;
        top: 9px;
        text-decoration: none;
      }
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Register new runtime</h1>
      <div class="modal-content">
      <p>
      \$NOFLO_APP_TITLE supports all flow-based programming runtimes that are compatible with the <a href="https://flowbased.github.io/fbp-protocol/" target="_blank">FBP protocol</a>.
      \$NOFLO_APP_TITLE comes with a bundled <a href="http://noflojs.org" target="_blank">NoFlo</a> runtime for the browser.
      Here are some other popular ones:
      </p>
      <ul class="runtimes">
      <template is="dom-repeat" items="{{runtimes}}" as="runtime">
      <li class\$="{{runtime.name}}">
        <a target="_blank" href\$="{{runtime.url}}">
          <noflo-icon icon="{{ runtime.icon }}" fallback="cog"></noflo-icon>
          <h2>{{runtime.label}}</h2>
          <p>{{runtime.description}}</p>
        </a>
      </li>
      </template>
      </ul>
      <p>
      Most runtimes provide a link that connects to them in \$NOFLO_APP_TITLE live mode at start-up. You can also add a runtime manually.
      </p>
      </div>
      <div class="toolbar">
        <button on-click="addRuntime">Add manually</button>
        <button on-click="close">Close</button>
      </div>
    </div>
`,

  is: 'noflo-new-runtime',

  properties: {
    runtimes: {
      value() {
        return runtimes;
      },
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
  },

  detached() {
    if (this.runtimeAdd) {
      if (PolymerDom(this.runtimeAdd).parentNode) {
        PolymerDom(PolymerDom(this.runtimeAdd).parentNode).removeChild(this.runtimeAdd);
      }
      this.runtimeAdd = null;
    }
    PolymerDom(document.getElementById('container')).classList.remove('blur');
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

  addRuntime(event) {
    event.preventDefault();
    this.runtimeAdd = document.createElement('noflo-add-runtime');
    PolymerDom(document.body).appendChild(this.runtimeAdd);
    this.runtimeAdd.addEventListener('new', (ev) => {
      this.fire('addRuntime', ev.detail);
    });
  },

  listeners: { click: 'close' },
});
