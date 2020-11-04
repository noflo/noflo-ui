import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import collections from '../src/collections';
import urls from '../src/urls';
import './the-panel';
import './the-graph-thumb';
import './noflo-new-graph';
import './noflo-new-component';
import './noflo-project-inspector';
import './noflo-project-sync';
import './noflo-icon';

Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }
      h2 {
        font-size: 16px;
        line-height: 36px;
        text-transform: none;
        font-weight: normal;
        padding: 0px;
        margin: 0px;
      }
      ul.graphs {
        margin-bottom: 144px;
      }
      ul.graphs li {
        width: 245px;
        height: 70px;
        overflow: hidden;
        float: left;
        text-align: center;
        background-color: hsl(190, 90%, 45%);
        color: black;
        border-radius: 3px;
        margin-right: 0px;
        margin-left: 0px;
        margin-bottom: 5px;
        position: relative;
        cursor: pointer;
      }
      ul.graphs li.add {
        background-color: var(--noflo-ui-text);
        color: var(--noflo-ui-background);
        cursor: default;
      }
      ul.graphs li the-graph-thumb {
        display: block;
        position: absolute;
        left: 100px;
        top: -20px;
      }
      ul.graphs li noflo-icon {
        display: block;
        position: absolute;
        right: 17px;
        top: 17px;
        font-size: 36px;
        color: black;
      }
      ul.graphs li button {
        display: block;
        position: absolute;
        right: 17px;
        top: 17px;
        background-color: transparent;
        color: hsl(190, 100%, 30%);
        border: 1px solid hsl(190, 100%, 30%);
        font-size: 13px;
        border-radius: 3px;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        height: 36px;
        padding-left: 13px;
        padding-right: 13px;
      }
      ul.graphs li h2 {
        position: absolute;
        top: 18px;
        left: 17px;
        width: 75px;
        text-transform: none;
        font-size: 13px;
        text-align: left;
        white-space: nowrap;
      }
      header h1 {
        text-align: center;
        height: 36px;
        line-height: 36px;
        font-size: 17px;
        white-space: nowrap;
        max-width: 100%;
        overflow-x: hidden;
        text-overflow: ellipsis;
        padding-left: 36px;
        box-sizing: border-box;
      }
      main ul {
        margin: 0px;
        padding: 0px;
        list-style: none;
      }
      main ul li {
        line-height: 36px;
        min-height: 36px;
      }
      main ul li a {
        color: var(--noflo-ui-text);
        text-decoration: none;
        display: block;
        cursor: pointer;
      }
      main ul li a i {
        float: right;
        line-height: 36px;
        color: var(--noflo-ui-border);
        margin-right: 4px;
      }
      main {
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        max-height: calc(100% - 72px);
        padding-left: 36px;
      }
      main.repo {
        max-height: calc(100% - 72px * 2);
      }
      main::-webkit-scrollbar {
        display: none;
      }
      footer {
        background-color: transparent;
        display: block;
        position: absolute;
        bottom: 0px;
        left: 0px;
        padding-left: 36px;
        width: 325px;
        padding-right: 36px;
        box-sizing: border-box;
        overflow: hidden;
        height: 72;
        transition: background-color 0.3s ease-in-out;
      }
      the-panel {
        background-color: var(--noflo-ui-background) !important;
        transition: left 0.3s ease-in-out, bottom 0.3s ease-in-out, right 0.3s ease-in-out, top 0.3s ease-in-out, width 0.1s ease-in-out;
        position: fixed;
        border: 0px solid var(--noflo-ui-border);
        box-sizing: border-box;
        top: 0px;
        border-right-width: 1px;
        height: 100vh;
        padding-right: 36px;
        z-index: 3;
      }
      the-panel:before {
        font-family: FontAwesomeSVG;
        content: '\\f03a';
        color: var(--noflo-ui-border-highlight);
        position: absolute;
        text-align: center;
        right: 0px;
        width: 36px;
        top: 50%;
        top: calc(50% - 7px);
        font-size: 17px;
        opacity: 0.25;
        transition: opacity 0.3s ease-in-out;
      }
      the-panel:not([open]):before {
        cursor: e-resize;
        opacity: 1;
      }
      #account[open] footer {
        background-color: hsl(190, 90%, 45%);
      }
      footer h1 {
        font-size: 17px;
        line-height: 36px;
        text-align: center;
        margin: 0;

        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      footer button {
        background-color: white;
        color: hsl(190, 90%, 45%);
        border: none;
        font-size: 13px;
        border-radius: 3px;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        height: 36px;
        padding-left: 17px;
        padding-right: 17px;
        line-height: 36px;
        display: block;
        margin-left: auto;
        margin-right: auto;
        cursor: pointer;
      }
      footer button:disabled {
        opacity: 0.5;
      }
    </style>
    <the-panel id="account" edge="left" size="324" handle="36">
      <header slot="header">
        <template is="dom-if" if="{{project}}">
        <h1>{{project.name}}</h1>
        </template>
        <template is="dom-if" if="{{!project}}">
        <h1>Live mode</h1>
        </template>
      </header>
      <main class\$="{{_computeClass(project)}}">
        <ul>
          <li>
            <a on-click="openHome">
              <noflo-icon icon="home"></noflo-icon>
              Home
            </a>
          </li>
          <template is="dom-if" if="{{project}}">
          <li>
            <a on-click="openSettings">
              <noflo-icon icon="cog"></noflo-icon>
              Settings
            </a>
          </li>
          </template>
        </ul>
        <template is="dom-if" if="{{project}}">
        <template is="dom-if" if="{{_canGraph(project, runtime)}}">
        <h2>Graphs</h2>
        <ul class="graphs">
          <li class="add">
            <h2>New graph</h2>
            <button on-click="newGraph">Create</button>
          </li>
          <template is="dom-repeat" items="{{project.graphs}}" as="graph">
          <li on-click="openGraph" data-id\$="{{graph.properties.id}}">
            <the-graph-thumb graph="{{graph}}" width="200" height="120"></the-graph-thumb>
            <h2>{{getName(graph)}}</h2>
          </li>
          </template>
        </ul>
        </template>
        <template is="dom-if" if="{{_canComponent(project, runtime)}}">
        <h2>Components</h2>
        <ul class="graphs">
          <li class="add">
            <h2>New component</h2>
            <button on-click="newComponent">Create</button>
          </li>
          <template is="dom-repeat" items="{{project.components}}" as="component">
          <li on-click="openComponent" data-id\$="{{component.name}}">
            <h2>{{getName(component)}}</h2>
            <template is="dom-if" if="{{_computeIf(component)}}">
            <noflo-icon icon="coffee"></noflo-icon>
            </template>
            <template is="dom-if" if="{{_computeIf2(component)}}">
            <noflo-icon icon="code"></noflo-icon>
            </template>
          </li>
          </template>
        </ul>
        </template>
        </template>
      </main>
      <template is="dom-if" if="{{project.repo}}">
      <footer slot="footer">
        <h1 title="{{project.repo}}">
          <noflo-icon icon="github"></noflo-icon>
          <span>{{project.repo}}</span>
        </h1>
        <button on-click="synchronize">
          <noflo-icon icon="cloud-upload"></noflo-icon>
          <span>Synchronize</span>
        </button>
      </footer>
      </template>
    </the-panel>
`,

  is: 'noflo-project',

  properties: {
    component: {
      value: null,
      notify: true,
    },
    graph: {
      value: null,
      notify: true,
    },
    project: {
      value: null,
      notify: true,
    },
    runtime: {
      value: null,
      observer: 'runtimeChanged',
    },
    runtimes: {
      type: Array,
      value() {
        return [];
      },
    },
  },

  runtimeChanged() {
    if (this.runtime && this.runtime.definition && this.runtime.definition.capabilities) {
      this.canComponent = this.runtime.definition.capabilities.indexOf('component:setsource') !== -1;
    }
  },

  newGraph(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    const dialog = document.createElement('noflo-new-graph');
    dialog.project = this.project;
    dialog.runtimes = this.runtimes;
    if (this.graph && this.graph.properties.environment) {
      dialog.type = this.graph.properties.environment.type || this.project.type;
    } else {
      dialog.type = this.project.type;
    }
    PolymerDom(document.body).appendChild(dialog);
    dialog.addEventListener('new', (ev) => {
      const graph = ev.detail;
      this.push('project.graphs', graph);
      this.fire('newgraph', graph);
      this.gotoGraph(graph.properties.id);
    });
  },

  newComponent(event) {
    if (!this.canComponent) {
      return;
    }
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    const dialog = document.createElement('noflo-new-component');
    dialog.project = this.project;
    if (this.graph && this.graph.properties.environment) {
      dialog.type = this.graph.properties.environment.type || this.project.type;
    } else {
      dialog.type = this.project.type;
    }
    PolymerDom(document.body).appendChild(dialog);
    dialog.addEventListener('new', (ev) => {
      const component = ev.detail;
      this.push('project.components', component);
      this.fire('newcomponent', component);
      // TODO: Add node to graph
      this.gotoComponent(component.name);
    });
    dialog.addEventListener('newSpec', (ev) => {
      const spec = ev.detail;
      this.push('project.specs', spec);
      this.fire('newspec', spec);
    });
  },

  openHome(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    this.$.account.toggleOpen(false);
    this.fire('hash', []);
  },

  openSettings(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'projectProperties');
    }
    const dialog = document.createElement('noflo-project-inspector');
    dialog.project = this.project;
    PolymerDom(document.body).appendChild(dialog);
    dialog.addEventListener('updated', (ev) => {
      Object.keys(ev.detail).forEach((property) => {
        this.set(`project.${property}`, ev.detail[property]);
      });
      if (this.project.repo) {
        this.set('project.gist', null);
        if (!this.project.branch) {
          this.set('project.branch', 'master');
        }
      }
      this.project.graphs.forEach((graph) => {
        if (graph.properties.id === this.project.main) {
          const { type } = graph.properties.environment;
          this.set('project.mainGraph', graph);
          this.set('project.type', type);
        }
      });
      // Send only the data we actually want to store
      this.fire('changed', this.project);
    });
    dialog.addEventListener('delete', (ev) => {
      this.$.account.toggleOpen(false);
      this.fire('deleteProject', ev.detail);
    });
  },

  gotoGraph(id) {
    this.$.account.toggleOpen(false);
    this.fire('hash', urls.getGraphHash(id, this.project));
    this.$.account.toggleOpen(false);
  },

  gotoComponent(id) {
    this.$.account.toggleOpen(false);
    this.fire('hash', urls.getComponentHash(id, this.project));
    this.$.account.toggleOpen(false);
  },

  openGraph(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'openGraph');
    }
    this.gotoGraph(event.currentTarget.getAttribute('data-id'));
  },

  openComponent(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'openComponent');
    }
    this.gotoComponent(event.currentTarget.getAttribute('data-id'));
  },

  synchronize(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'syncGithub');
    }
    this.fire('sync', {
      repo: this.project.repo,
      project: this.project,
    });
    this.$.account.toggleOpen(false);
  },

  confirm(operation) {
    const dialog = document.createElement('noflo-project-sync');
    dialog.operation = operation;
    PolymerDom(document.body).appendChild(dialog);
    dialog.addEventListener('sync', (event) => {
      if (typeof ga === 'function') {
        if (event.detail.push.length) {
          ga('send', 'event', 'button', 'click', 'pushGithub');
        }
        if (event.detail.pull.length) {
          ga('send', 'event', 'button', 'click', 'pullGithub');
        }
      }
      this.fire('syncDecision', event.detail);
    });
  },

  _computeClass(project) {
    return project && project.repo ? 'repo' : 'norepo';
  },

  _computeIf(component) {
    return component.language === 'coffeescript';
  },

  _computeIf2(component) {
    return component.language !== 'coffeescript';
  },

  _canGraph() {
    if (this.runtime && this.runtime.definition && this.runtime.definition.capabilities) {
      // If we have a runtime connection, only allow creating components if setsource is enabled
      return this.runtime.definition.capabilities.indexOf('protocol:graph') !== -1;
    }
    return true;
  },

  _canComponent() {
    if (this.runtime && this.runtime.definition && this.runtime.definition.capabilities) {
      // If we have a runtime connection, only allow creating components if setsource is enabled
      return this.runtime.definition.capabilities.indexOf('component:setsource') !== -1;
    }
    return true;
  },

  getName(entity) {
    return collections.unnamespace(collections.getName(entity));
  },
});
