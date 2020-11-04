import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import collections from '../src/collections';
import urls from '../src/urls';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      p {
        font-size: 13px;
        line-height: 18px;
      }
      p a, label a {
        color: rgb(0, 127, 153);
        text-decoration: none;
      }
      button.delete {
        position: absolute;
        right: 36px;
        border: 0px solid hsla( 0, 98%, 46%, .8) !important;
        color: hsla( 0, 98%, 46%, .8) !important;
      }
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1><span>{{getName(component)}}</span></h1>
      <template is="dom-if" if="{{inGraph.length}}">
      <p>Used as component in
      <template is="dom-repeat" items="{{inGraph}}" as="parent">
        <a href\$="{{_computeHref(parent, project)}}">
          <span>{{getName(parent)}}</span>
        </a>
      </template>
      </p>
      </template>
      <template is="dom-if" if="{{errorText}}">
        <div class="error">{{errorText}}</div>
      </template>
      <form>
        <div class="toolbar">
          <!-- <button on-click="{{send}}">Save</button> -->
          <a on-click="close">Cancel</a>
          <button class="delete" on-click="delete">Delete</button>
        </div>
      </form></div>
`,

  is: 'noflo-component-inspector',

  properties: {
    component: {
      value: null,
      observer: 'componentChanged',
    },
    inGraph: {
      type: Array,
      value() {
        return [];
      },
    },
    project: { value: null },
    errorText: {
      type: String,
      value: '',
    },
  },

  attached() {
    Polymer.dom(document.getElementById('container')).classList.add('blur');
    Polymer.dom(this).classList.add('modal-content');
    this.inGraph = [];
    if (this.project) {
      this.project.graphs.forEach((graph) => {
        graph.nodes.forEach((node) => {
          if (node.component === collections.unnamespace(this.component.name)
            || node.component === collections.namespace(
              this.component.name,
              this.project.namespace,
            )) {
            this.push('inGraph', graph);
          }
        });
      });
    }
  },

  detached() {
    Polymer.dom(document.getElementById('container')).classList.remove('blur');
  },

  componentChanged() {
  },

  delete(event) {
    event.preventDefault();
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'deleteComponent');
    }
    this.fire('delete', this.component);
    this.close();
  },

  bgClick(event) {
    // Don't close if clicking within container
    event.stopPropagation();
  },

  close() {
    if (!Polymer.dom(this).parentNode) {
      return;
    }
    Polymer.dom(Polymer.dom(this).parentNode).removeChild(this);
  },

  _computeHref(parent, project) {
    const hash = urls.getGraphHash(parent.properties.id, project);
    return urls.hashToString(hash);
  },

  listeners: { click: 'close' },

  getName(entity) {
    return collections.unnamespace(collections.getName(entity));
  },
});
