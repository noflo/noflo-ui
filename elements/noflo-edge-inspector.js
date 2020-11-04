import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import { unnamespace } from '../src/collections';
import './noflo-icon';
import './the-card-styles';

Polymer({
  _template: html`
    <style include="the-card-styles">
      h1 {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 10px;
        width: 100%;
      }
      h1 .connection {
        text-transform: uppercase;
        font-size: 9px;
      }
      h1 .connection.route0 { color: #fff; }
      h1 .connection.route1 { color: hsl(  0,  98%, 46%); }
      h1 .connection.route2 { color: hsl( 35,  98%, 46%); }
      h1 .connection.route3 { color: hsl( 60,  98%, 46%); }
      h1 .connection.route4 { color: hsl(135,  98%, 46%); }
      h1 .connection.route5 { color: hsl(160,  98%, 46%); }
      h1 .connection.route6 { color: hsl(185,  98%, 46%); }
      h1 .connection.route7 { color: hsl(210,  98%, 46%); }
      h1 .connection.route8 { color: hsl(285,  98%, 46%); }
      h1 .connection.route9 { color: hsl(310,  98%, 46%); }
      h1 .connection.route10 {color: hsl(335,  98%, 46%); }

      ul#events {
        max-height: 140px;
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        clear: left;
      }
      ul#events li {
        font-size: 10px;
        line-height: 14px;
        margin-bottom: 0px;
        color: var(--noflo-ui-text-highlight);
        overflow: hidden;
        margin-bottom: 4px;
        padding-bottom: 2px;
        border-bottom: 1px hsla(190, 100%, 30%, 0.4) solid;
      }
      ul#events li.openBracket {
        color: var(--noflo-ui-border);
      }
      ul#events li.openBracket:before {
        display: inline;
        content: '<';
      }
      ul#events li.openBracket:after {
        display: inline;
        content: '>';
      }
      ul#events li.closeBracket {
        color: var(--noflo-ui-border);
      }
      ul#events li.closeBracket:before {
        display: inline;
        content: '</';
      }
      ul#events li.closeBracket:after {
        display: inline;
        content: '>';
      }
      ul#events img {
        margin: 5px;
        max-width: 100px;
      }
      button#clear {
        color: var(--noflo-ui-border-highlight)
        position: absolute;
        right: 0px;
        top: 9px;
        line-height: 36px;
        background-color: var(--noflo-ui-background);
      }
    </style>
    <header>
      <h1 slot="header"><span>{{sourceNode}}</span> <span class\$="{{_computeClass(route)}}"><span>{{sourcePort}}</span> ➞ <span>{{targetPort}}</span></span> <span>{{targetNode}}</span></h1>
    </header>
    <template is="dom-if" if="[[log.length]]">
    <ul class="toolbar toolbar2right">
      <li>
        <button id="clear" on-click="clear" class="blue-button" title="Clear log">
          <noflo-icon icon="ban"></noflo-icon>
        </button>
      </li>
    </ul>
    </template>
    <ul id="events">
      <template is="dom-repeat" items="[[log]]" as="packet">
        <li class\$="{{ packet.type }}">
          {{ packet.data }}
        </li>
      </template>
    </ul>
`,

  is: 'noflo-edge-inspector',

  properties: {
    edge: {
      value: null,
      notify: true,
      observer: 'edgeChanged',
    },
    graph: {
      value: null,
      notify: true,
    },
    log: {
      value() {
        return [];
      },
      observer: 'logChanged',
    },
    route: {
      type: Number,
      value: 0,
    },
    sourceNode: {
      type: String,
      value: '',
    },
    sourcePort: {
      type: String,
      value: '',
    },
    targetNode: {
      type: String,
      value: '',
    },
    targetPort: {
      type: String,
      value: '',
    },
  },

  attached() {
    PolymerDom(this).classList.add('the-card-content');
  },

  edgeChanged() {
    if (!this.edge) {
      return;
    }
    const src = this.edge.from;
    const tgt = this.edge.to;
    this.sourceNode = this.nodeLabel(src.node);
    this.sourcePort = src.port;
    this.targetNode = this.nodeLabel(tgt.node);
    this.targetPort = tgt.port;
    this.route = this.edge.metadata.route;
  },

  logChanged() {
    this.$.events.scrollTop = this.$.events.scrollHeight;
  },

  nodeLabel(node) {
    return unnamespace(node).split('_')[0];
  },

  clear() {
    this.fire('clear:runtimepackets', {
      edge: this.edge,
    });
  },

  _computeClass(route) {
    return `connection route${route}`;
  },
});
