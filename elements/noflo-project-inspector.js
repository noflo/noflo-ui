import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      button.delete {
        position: absolute;
        right: 36px;
        border: 0px solid hsla( 0, 98%, 46%, .8) !important;
        color: hsla( 0, 98%, 46%, .8) !important;
      }
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1><span>{{project.name}}</span> settings</h1>
      <div class="modal-content">
      <template is="dom-if" if="{{errorText}}">
        <div class="error">{{errorText}}</div>
      </template>
      <form>
        <label>
          <span>GitHub repository</span>
          <input type="text" value="{{repo::input}}" placeholder="username/my-project" autocapitalize="off" autocorrect="off" required="">
        </label>
        <label>
          <span>Project label</span>
          <input type="text" value="{{name::input}}" placeholder="My Cool Project" required="">
        </label>
        <label>
          <span>Project namespace</span>
          <input type="text" value="{{namespace::input}}" placeholder="my-cool-project" required="">
        </label>
        <label>
          <span>Main graph</span>
          <select name="type" value="{{main::input}}">
            <template is="dom-repeat" items="[[_getMainGraphs(project.graphs)]]" as="graph">
              <option value="{{graph.properties.id}}" selected\$="[[_mainSelected(graph.properties.id, main)]]">{{graph.name}}</option>
            </template>
          </select>
        </label>
        </form>
      </div>
      <div class="toolbar">
        <button on-click="send">Save</button>
        <a on-click="close">Cancel</a>
        <a href="https://github.com/new" target="_blank">New Repository</a>
        <button class="delete" on-click="delete">Delete</button>
      </div>
      </div>
`,

  is: 'noflo-project-inspector',

  properties: {
    errorText: {
      type: String,
      value: '',
    },
    main: {
      type: String,
      value: '',
    },
    name: {
      type: String,
      value: '',
    },
    namespace: {
      type: String,
      value: '',
    },
    originalRepo: {
      type: String,
      value: '',
    },
    project: { observer: 'projectChanged' },
    repo: {
      type: String,
      value: '',
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  projectChanged() {
    this.originalRepo = this.project.repo;
    this.repo = this.project.repo;
    this.name = this.project.name;
    this.namespace = this.project.namespace || this.project.id;
    this.main = this.project.main;
  },

  updateProject() {
    this.fire('updated', {
      id: this.project.id,
      name: this.name,
      namespace: this.namespace,
      main: this.main,
      type: this.project.type,
      repo: this.repo,
    });
    this.close();
  },

  send(event) {
    if (event) {
      event.preventDefault();
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'saveProjectProperties');
    }
    this.updateProject();
  },

  delete(event) {
    event.preventDefault();
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'deleteProject');
    }
    this.fire('delete', this.project);
    this.close();
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

  _mainSelected(graphId, main) {
    if (graphId === main) {
      return true;
    }
    return false;
  },

  _getMainGraphs(graphs) {
    return graphs.filter((graph) => graph.properties.main);
  },
});
