import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import TestStatus from '../src/components/TestStatus';
import './noflo-runtime-selector';
import './noflo-runtime-testdetails';
import './noflo-icon';

Polymer({
  _template: html`
    <style>
      :host {
        display: block;
        padding-left: 18px;
        box-sizing: border-box;
        color: var(--noflo-ui-text);
        background-color: var(--noflo-ui-background) !important;
        background-image: radial-gradient(1px at 0px 0px, hsl(210, 50%, 60%) 0.5px, var(--noflo-ui-background) 1px);
        background-size: calc(100% - 1px);
        background-position: 0px;
        border-bottom: 1px var(--noflo-ui-border) solid;
      }

      #runtime_icon {
        position: absolute;
        right: 8px;
        top: 0px;
        font-size: 72px;
        color: hsla(185, 100%, 75%, 0.1);
      }

      #teststatus {
        position: absolute;
        right: 0px;
        z-index: 1;
        width: 100px;
      }
      #teststatus ul {
        margin: 0px;
        padding: 0px;
      }
      #teststatus ul li {
        display: inline;
        padding-left: 8px;
        line-height: 36px;
      }
      #teststatus ul li.pass {
        color: hsl(135, 98%, 46%);
      }
      #teststatus ul li.fail {
        color: hsl(0, 98%, 46%);
      }
      #teststatus ul li.skip {
        color: hsl( 60, 98%, 46%);
      }

      h2 {
        font-size: 14px;
        width: 216px;
        font-weight: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 36px;
        margin: 0px;
        padding: 0px;
      }

      button {
        width: 36px;
        height: 36px;
        font-size: 10px;
        background-color: transparent;
        border: none;
        color: var(--noflo-ui-text-highlight);
        text-align: center;
        cursor: pointer;
      }

      #address h2 {
        position: absolute;
        left: 54px;
        width: 180px;
        top: 0px;
        color: var(--noflo-ui-text);
      }

      #address, #address button {
        color: #e70215;
      }
      .online#address, .online#address button {
        color: #01d159;
      }
      #address button.clear {
        position: absolute;
        right: 0px;
        color: var(--noflo-ui-text-highlight);
      }

      #runcontrol h2 {
        position: absolute;
        left: 54px;
        top: 36px;
      }
      #runcontrol button {
        color: var(--noflo-ui-text-highlight);
      }

      #select {
        text-align: center;
      }
      #select button.select {
        width: auto;
        height: auto;
        background-color: hsl(190, 90%, 45%);
        color: hsla(0, 0%, 0%, 0.98);
        border: none;
        font-size: 13px;
        border-radius: 3px;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        height: 36px;
        padding-left: 36px;
        padding-right: 36px;
        margin: 0px;
        margin-top: 18px;
      }
    </style>
    <template is="dom-if" if="{{runtime}}">
      <noflo-icon id="runtime_icon" icon="{{icon}}"></noflo-icon>
      <div id="address" class\$="{{_computeOnlineClass(runtime.status.online)}}">
        <button title="Connect/Disconnect" on-click="reconnect"><noflo-icon icon="refresh"></noflo-icon></button>
        <h2>{{_produceAddress(runtime)}}</h2>
        <button title="Change Runtime" on-click="clearRuntime" class="clear"><noflo-icon icon="exchange"></noflo-icon></button>
      </div>
      <div id="teststatus" on-click="showTestDetails"></div>
      <div id="runcontrol">
        <template is="dom-if" if="{{runtime.status.online}}">
          <template is="dom-if" if="{{runtime.execution.running}}">
            <button title="Stop" class="stop" on-click="stop"><noflo-icon icon="pause"></noflo-icon></button>
          </template>
          <template is="dom-if" if="{{!runtime.execution.running}}">
            <button title="Start" class="start" on-click="start"><noflo-icon icon="play"></noflo-icon></button>
          </template>
          <h2>{{runtime.execution.label}}</h2>
        </template>
      </div>
    </template>
    <template is="dom-if" if="{{!runtime}}">
      <div id="select">
        <button on-click="selectRuntime" class="select">Select runtime</button>
      </div>
    </template>
`,

  is: 'noflo-runtime',

  properties: {
    icon: {
      type: String,
      value: 'asterisk',
    },
    graph: {
      value: null,
      observer: 'graphChanged',
    },
    component: {
      value: null,
      observer: 'graphChanged',
    },
    panel: { value: null },
    iframe: { value: null },
    runtime: {
      value: null,
      observer: 'runtimeChanged',
    },
    runtimes: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    suites: {
      type: Array,
      value() {
        return [];
      },
    },
  },

  attached() {
    PolymerDom(this).classList.add('gpu');
  },

  clearRuntime() {
    // Disassociate old runtime with this project
    this.runtime.definition.project = null;
    this.fire('changed', this.runtime.definition);
    this.set('runtime', null);
    this.graphChanged();
  },

  graphChanged() {
    if (this.runtimeSelector) {
      if (PolymerDom(this.runtimeSelector).parentNode) {
        PolymerDom(PolymerDom(this.runtimeSelector).parentNode).removeChild(this.runtimeSelector);
      }
      this.runtimeSelector = null;
    }
  },

  runtimeChanged() {
    const runtimeIframe = this.getRuntimeIframe();
    if (this.iframe && this.iframe !== runtimeIframe) {
      // Hide old iframe
      this.hideCard();
    }
    this.iframe = runtimeIframe;
    if (!this.runtime) {
      return;
    }
    this.set('icon', this.getRuntimeIcon(this.runtime));
    if (!this.runtime.status || !this.runtime.status.online) {
      this.hideCard();
    } else if (this.runtime.execution && this.runtime.execution.running) {
      this.showCard();
    }
  },

  start(event) {
    event.preventDefault();
    if (!this.runtime || !this.graph) {
      return;
    }
    this.showCard();
    this.fire('start', {
      runtime: this.runtime.definition.id,
      graph: this.graph,
    });
  },

  stop(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.runtime || !this.graph) {
      return;
    }
    this.fire('stop', {
      runtime: this.runtime.definition.id,
      graph: this.graph,
    });
  },

  reconnect(event) {
    if (event) {
      event.preventDefault();
    }
    this.fire('reconnect', {
      runtime: this.runtime.definition.id,
    });
  },

  showTests(suites) {
    this.suites = suites;
    const container = this.shadowRoot.getElementById('teststatus');
    ReactDOM.render(TestStatus({ suites: this.suites }), container);
  },

  showTestDetails() {
    if (!this.suites || !this.suites.length) {
      return;
    }
    const details = document.createElement('noflo-runtime-testdetails');
    details.suites = this.suites;
    PolymerDom(document.body).appendChild(details);
  },

  showCard() {
    if (!this.iframe) {
      return;
    }
    this.setIframeVisibility(this.iframe, 'block');
  },

  hideCard() {
    if (!this.iframe) {
      return;
    }
    this.setIframeVisibility(this.iframe, 'none');
  },

  getRuntimeIframe() {
    if (!this.runtime || !this.runtime.definition) {
      return null;
    }
    if (!this.runtime.definition.querySelector) {
      return null;
    }
    const iframe = document.body.querySelector(this.runtime.definition.querySelector);
    if (!iframe) {
      return null;
    }
    return iframe;
  },

  setIframeVisibility(iframe, visibility) {
    // eslint-disable-next-line no-param-reassign
    iframe.style.display = visibility;
  },

  selectRuntime() {
    if (!this.graph && !this.component) {
      return;
    }
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    this.runtimeSelector = document.createElement('noflo-runtime-selector');
    this.set('runtimeSelector.runtimes', this.runtimes);
    this.set('runtimeSelector.graph', this.graph);
    this.set('runtimeSelector.component', this.component);
    this.runtimeSelector.addEventListener('runtime', (event) => {
      const runtime = event.detail;
      if (this.graph) {
        runtime.project = this.graph.properties.project;
      }
      if (this.component) {
        runtime.project = this.component.project;
      }
      this.fire('changed', runtime);
      setTimeout(() => {
        this.fire('switchRuntime', runtime.id);
      }, 10);
    });
    PolymerDom(document.body).appendChild(this.runtimeSelector);
  },

  getRuntimeIcon(runtime) {
    if (!runtime || !runtime.definition || !runtime.definition.type) {
      return 'cog';
    }
    switch (runtime.definition.type) {
      case 'noflo-browser':
        return 'html5';
      case 'noflo-nodejs':
        return 'cloud';
      case 'noflo-gnome':
        return 'desktop';
      case 'microflo':
        return 'lightbulb-o';
      case 'javafbp':
        return 'android';
      case 'imgflo':
        return 'picture-o';
      case 'sndflo':
        return 'music';
      default:
        return 'cog';
    }
  },

  _computeOnlineClass(online) {
    return this.tokenList({ online });
  },

  _produceAddress(runtime) {
    if (!runtime.definition) {
      return '';
    }
    if (runtime.definition.protocol === 'webrtc') {
      return `WebRTC P2P ${runtime.definition.id}`;
    }
    return runtime.definition.address;
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
