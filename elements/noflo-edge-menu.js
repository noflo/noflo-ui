import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-icon';
import './the-card-styles';

Polymer({
  _template: html`
    <style include="the-card-styles">
      :host {
        display: block;
        background-color: var(--noflo-ui-background) !important;
        color: var(--noflo-ui-text);
        background-image: radial-gradient(1px at 0px 0px, hsl(210, 50%, 60%) 0.5px, hsla(0, 0%, 0%, 0) 1px);
        background-size: calc(100% - 1px) 100%;
        background-position: 0px;
      }
      h1 {
        font-size:15px;
      }
      ul.toolbar2right {
        right: 0px !important;
      }
      ul.routes {
        margin: 0;
        margin-left: 0px;
        margin-right: 0px;
        padding-top: 10px;
      }
      ul.routes li {
        display: inline-block;
        position: relative;
        float: left;
        margin: 0px;
        height: 26px;
      }
      ul.routes li button:hover {
        opacity: 1;
      }
      ul.routes li button {
        opacity: 0.7;
        display: block;
        padding: 0px;
        margin: 0;
        width: 100%;
        height: 100%;
        -webkit-box-sizing: border-box;
           -mox-box-sizing: border-box;
                box-sizing: border-box;
        border: none;
      }

      .routes button {
        width: 25px !important;
        height: 20px !important;
        background-color: hsla(  0, 98%, 100%, .8); 
        border: 1px solid hsl(  0, 98%, 46%);
      }
      .routes button.route0  { 
        background-color: hsla(  0, 98%, 100%, .8); 
        border-color:      hsl(  0, 98%, 46%); 
      }
      .routes button.route1  { 
        background-color: hsla(  0, 98%, 46%, .8); 
        border-color:      hsl(  0, 98%, 46%); 
      }
      .routes button.route2  { 
        background-color: hsla( 35, 98%, 46%, .8); 
        border-color:      hsl( 35, 98%, 46%); 
      }
      .routes button.route3  { 
        background-color: hsla( 60, 98%, 46%, .8); 
        border-color:      hsl( 60, 98%, 46%); 
      }
      .routes button.route4  { 
        background-color: hsla(135, 98%, 46%, .8); 
        border-color:      hsl(135, 98%, 46%); 
      }
      .routes button.route5  { 
        background-color: hsla(160, 98%, 46%, .8); 
        border-color:      hsl(160, 98%, 46%);
      }
      .routes button.route6  { 
        background-color: hsla(185, 98%, 46%, .8); 
        border-color:      hsl(185, 98%, 46%);
      }
      .routes button.route7  { 
        background-color: hsla(210, 98%, 46%, .8); 
        border-color:      hsl(210, 98%, 46%);
      }
      .routes button.route8  { 
        background-color: hsla(285, 98%, 46%, .8); 
        border-color:      hsl(285, 98%, 46%);
      }
      .routes button.route9  { 
        background-color: hsla(310, 98%, 46%, .8); 
        border-color:      hsl(310, 98%, 46%);
      }
      .routes button.route10 { 
        background-color: hsla(335, 98%, 46%, .8); 
        border-color:      hsl(335, 98%, 46%);
      }
      
      .routes  button.route0:hover  { background-color: hsla(  0, 98%, 100%, 1); }
      .routes  button.route1:hover  { background-color: hsla(  0, 98%, 46%, 1); }
      .routes  button.route2:hover  { background-color: hsla( 35, 98%, 46%, 1); }
      .routes  button.route3:hover  { background-color: hsla( 60, 98%, 46%, 1); }
      .routes  button.route4:hover  { background-color: hsla(135, 98%, 46%, 1); }
      .routes  button.route5:hover  { background-color: hsla(160, 98%, 46%, 1); }
      .routes  button.route6:hover  { background-color: hsla(185, 98%, 46%, 1); }
      .routes  button.route7:hover  { background-color: hsla(210, 98%, 46%, 1); }
      .routes  button.route8:hover  { background-color: hsla(285, 98%, 46%, 1); }
      .routes  button.route9:hover  { background-color: hsla(310, 98%, 46%, 1); }
      .routes button.route10:hover  { background-color: hsla(335, 98%, 46%, 1); }
    </style>
    <header>
      <h1 slot="header" class="clear" on-click="clear"><span>{{ edges.length}}</span> <template is="dom-if" if="{{_computeIf(edges)}}">Edges</template><template is="dom-if" if="{{_computeIf2(edges)}}">Edge</template></h1>
    </header>
    <ul class="toolbar toolbar2right">
      <template is="dom-if" if="{{secure}}">
        <li>
          <button class="blue-button" on-click="setUnsecure" title="Set as visible">
            <noflo-icon icon="lock"></noflo-icon>&nbsp;Secure
          </button>
        </li>
      </template>
      <template is="dom-if" if="{{!secure}}">
        <li>
          <button class="blue-button" on-click="setSecure" title="Set as hidden">
            <noflo-icon icon="unlock"></noflo-icon>&nbsp;Visible
          </button>
        </li>
      </template>
    </ul>
    <ul class="routes">
      <template is="dom-repeat" items="{{routes}}" as="route">
        <li><button name="{{route}}" on-click="setRoute" class\$="{{_computeClass(route)}}"></button></li>
      </template>
    </ul>    
`,

  is: 'noflo-edge-menu',

  properties: {
    edges: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'edgesChanged',
    },
    graph: { value: null },
    routes: {
      type: Array,
      value() {
        return [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          9,
          10,
        ];
      },
    },
    secure: {
      type: Boolean,
      value: false,
    },
  },

  attached() {
    PolymerDom(this).classList.add('the-card-content');
    PolymerDom(this).classList.add('sticky-head');
  },

  edgesChanged() {
    if (!this.edges.length) {
      return;
    }
    this.secure = true;
    for (let i = 0; i < this.edges.length; i += 1) {
      if (!this.edges[i].metadata.secure) {
        this.secure = false;
        return;
      }
    }
  },

  clear(event) {
    event.preventDefault();
    let edge;
    while (this.edges.length) {
      edge = this.pop('edges');
      edge.selected = false;
    }
  },

  remove(event) {
    event.preventDefault();
    while (this.edges.length) {
      const edge = this.pop('edges');
      if (PolymerDom(edge).parentNode) {
        PolymerDom(PolymerDom(edge).parentNode).removeChild(edge);
      }
    }
  },

  setRoute(event) {
    event.preventDefault();
    const route = parseInt(event.currentTarget.getAttribute('name'), 10);
    this.graph.startTransaction('changeroute');
    this.edges.forEach((edge) => {
      this.graph.setEdgeMetadata(
        edge.from.node,
        edge.from.port,
        edge.to.node,
        edge.to.port,
        {
          route,
        },
      );
    });
    this.graph.endTransaction('changeroute');
  },

  setSecure(event) {
    event.preventDefault();
    this.toggleSecure(true);
  },

  setUnsecure(event) {
    event.preventDefault();
    this.toggleSecure(false);
  },

  toggleSecure(secure) {
    this.graph.startTransaction('changesecure');
    this.edges.forEach((edge) => {
      const meta = edge.metadata;
      meta.secure = secure;
      this.graph.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, meta);
    });
    this.graph.endTransaction('changesecure');
    this.secure = secure;
  },

  _computeIf(edges) {
    return edges.length > 1;
  },

  _computeIf2(edges) {
    return edges.length === 1;
  },

  _computeClass(route) {
    return `route${route}`;
  },
});
