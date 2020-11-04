import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import TestStatusDetailed from '../src/components/TestStatusDetailed';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      #testlisting ul {
        padding: 0px;
      }
      li .suite-header label.topic {
        font-weight: bold;
      }
      li .suite-header label {
        display: inline !important;
        padding-right: 1em;
        color: var(--noflo-ui-text-highlight);
      }
      li.testsuite {
        margin-bottom: 1em;
      }
      li {
        list-style: none;
      }
      li.testsuite li {
        margin-left: 28px;
      }
      li label {
        display: inline;
        margin-top: 7px !important;
      }
      li label.assertion {
        padding-left: 8px;
      }
      li label.error {
        margin-bottom: 8px;
        font-style: italic;
        display: block;
      }
      li.pass {
        color: hsl(135, 98%, 46%);
        list-style: disc;
      }
      li.fail {
        color: hsl(0, 98%, 46%);
        list-style: square;
      }
      li.skip {
        color: hsl( 60, 98%, 46%);
        list-style: disc;
      }
    </style>
    <div class="modal-container" on-click="bgClick">
      <div class="modal-content">
        <div id="testlisting"></div>
      </div>
      <div class="toolbar">
        <button on-click="close">Close</button>
      </div>
    </div>
`,

  is: 'noflo-runtime-testdetails',

  properties: {
    suites: {
      type: Array,
      value() {
        return [];
      },
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
    const container = this.shadowRoot.getElementById('testlisting');
    ReactDOM.render(TestStatusDetailed({ suites: this.suites }), container);
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  close() {
    if (!PolymerDom(this).parentNode) {
      return;
    }
    PolymerDom(PolymerDom(this).parentNode).removeChild(this);
  },

  listeners: { click: 'close' },
});
