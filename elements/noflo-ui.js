import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import projects from '../src/projects';
import './noflo-main';
import './the-graph-editor';
import './noflo-library';
import './noflo-context';
import './noflo-runtime';
import './noflo-journal';
import './noflo-component-editor';
import './noflo-search';
import './noflo-project';
import './noflo-packets';
import './noflo-alert';

Polymer({
  _template: html`
    <style>
      /*
       * z-indexes:
       *
       * Modal dialogs: 5
       * Main screen: 4
       * Panels: 3
       * Context cards & runtime controls: 2
       * Workspace chrome: 1
       * Workspace: 0
       */
      :host {
        display: block;
      }

      noflo-main {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        z-index: 4;
      }
      the-graph-editor {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
      }
      noflo-component-editor {
        position: fixed;
        top: 0;
        left: 36px;
        height: 100vh;
        right: 36px;
        z-index: 0;
      }
      noflo-search {
        position: fixed;
        top: 0px;
        left: 36px;
        width: 288px;
        height: 72px;
        z-index: 2;
      }
      noflo-runtime {
        position: fixed;
        top: 0px;
        right: 36px;
        width: 288px;
        height: 72px;
        z-index: 3;
      }
      noflo-journal {
        position: fixed;
        bottom: 0px;
        right: 36px;
        width: 288px;
        z-index: 3;
      }

      #alert {
        box-sizing: border-box;
        position: fixed;
        top: -144px;
        left: 0;
        right: 0;
        z-index: 10;
        max-height: 144px;
        overflow: hidden;
        transition: top 0.3s ease-in-out;
      }
      #alert.show {
        top: 0;
      }
      #asproject::before {
        content: ' ';
        position: absolute;
        border: 2px solid hsl(185, 98%, 46%);
        border-radius: 6px;
        top: -6px;
        bottom: -6px;
        left: -6px;
        right: -6px;
      }
      #asproject:hover {
        background-color: black;
        color: hsl(185, 98%, 46%);
      }
      #asproject {
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        position: fixed;
        box-sizing: border-box;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9;
        background-color: hsla(185, 98%, 46%, .8);
        border: 1px solid hsl(185, 98%, 46%);
        color: black;
        top: 36px;
        height: 36px;
        border-radius: 3px;
        padding: 8px;
        cursor: pointer;
        transition: color 0.3s ease, background-color 0.3s ease, opacity 5.0s ease-in;
        visibility: hidden;
        opacity: 0;
      }
    </style>
    <noflo-main id="main" theme="[[theme]]" runtimes="{{ctx.runtimes}}" projects="{{ctx.projects}}" user="{{ctx.user}}" remote-projects="{{ctx.remoteProjects}}"></noflo-main>
    <the-graph-editor id="grapheditor" theme="[[theme]]" width="{{width}}" height="{{height}}" graph="{{ctx.graph}}" icons="[[ctx.icons]]"></the-graph-editor>
    <noflo-library id="library" search="{{ctx.search}}" project="{{ctx.project}}" graphs="{{ctx.graphs}}"></noflo-library>
    <noflo-context id="context" nodes="{{ctx.nodes}}" edges="{{ctx.edges}}" runtime="{{ctx.runtime}}" project="{{ctx.project}}" graphs="{{ctx.graphs}}" runtimes="{{ctx.runtimes}}" events="[[ctx.events]]"></noflo-context>
    <noflo-runtime id="runtime" runtime="{{ctx.runtime}}" runtimes="{{ctx.compatible}}" graph="{{ctx.graph}}" component="{{ctx.component}}"></noflo-runtime>
    <noflo-journal id="journal" db="{{ctx.db}}" theme="[[theme]]" graph="{{ctx.graph}}" component="{{ctx.component}}"></noflo-journal>
    <noflo-component-editor id="componenteditor" theme="[[theme]]" width="{{width}}" height="{{height}}" runtime="{{ctx.runtime}}" project="{{ctx.project}}" component="{{ctx.component}}"></noflo-component-editor>
    <noflo-search id="search" theme="[[theme]]" runtimes="{{ctx.runtimes}}" project="{{ctx.project}}" graph="{{ctx.graph}}" component="{{ctx.component}}" graphs="{{ctx.graphs}}"></noflo-search>
    <noflo-project id="project" runtimes="{{ctx.runtimes}}" graph="{{ctx.graph}}" project="{{ctx.project}}" component="{{ctx.component}}" runtime="{{ctx.runtime}}"></noflo-project>
    <noflo-packets id="packets" edges="[[ctx.edges]]" nodes="[[ctx.nodes]]" currentgraph="[[ctx.graph]]" packets="[[ctx.packets]]" events="[[ctx.events]]"></noflo-packets>
    <noflo-alert id="alert" on-click="hideAlert"></noflo-alert>
`,

  is: 'noflo-ui',

  properties: {
    ctx: {
      type: Object,
      value() {
        return {
          db: null,
          search: null,
          graph: null,
          component: null,
          graphs: [],
          project: null,
          projects: [],
          runtime: null,
          runtimes: [],
          compatibleRuntimes: [],
          packets: [],
          edges: [],
          nodes: [],
        };
      },
    },
    theme: {
      type: String,
      value: 'dark',
      notify: true,
      observer: 'themeChanged',
    },
    dontAutoHideAlert: {
      type: Boolean,
      value: false,
    },
    height: {
      value() {
        return window.innerHeight;
      },
      notify: true,
    },
    width: {
      value() {
        return window.innerWidth;
      },
      notify: true,
    },
  },

  clearContextFirst: [
    'graphs',
    'runtimes',
    'projects',
    'edges',
    'nodes',
    'compatibleRuntimes',
    'remoteProjects',
  ],

  emitEvent(event, payload) {
    this.fire(event, payload);
  },

  ready() {
    this.$.main.addEventListener('userUpdated', (event) => {
      this.emitEvent('user:update', event.detail);
    });
    this.$.main.addEventListener('logout', () => {
      this.emitEvent('user:logout', true);
    });
    this.$.main.addEventListener('login', () => {
      this.emitEvent('user:login', {
        url: window.location.href,
        scopes: [],
      });
    });
    this.$.main.addEventListener('relogin', (event) => {
      this.emitEvent('user:login', {
        url: window.location.href,
        scopes: [event.detail],
      });
    });
    this.$.main.addEventListener('fetchRemote', (event) => {
      this.emitEvent('flowhub:projects:fetch', event.detail);
    });
    this.$.main.addEventListener('downloadProject', (event) => {
      this.emitEvent('application:sethash', [
        'github',
        event.detail.org,
        event.detail.repo,
        'tree',
        event.detail.branch,
      ]);
    });
    this.$.main.addEventListener('fetchRuntimes', (event) => {
      this.emitEvent('flowhub:runtimes:fetch', event.detail);
    });
    this.$.main.addEventListener('newgraph', (event) => {
      this.emitEvent('storage:save:graph', event.detail);
      if (!this.ctx.runtime || !this.ctx.runtime.definition || !this.ctx.runtime.definition.id) {
        return;
      }
      this.emitEvent('runtime:sendGraph', {
        runtime: this.ctx.runtime.definition.id,
        graph: event.detail,
        project: this.ctx.project,
      });
    });
    this.$.main.addEventListener('newruntime', (event) => {
      this.emitEvent('flowhub:runtimes:register', event.detail);
    });
    this.$.main.addEventListener('newproject', (event) => {
      this.emitEvent('storage:save:project', event.detail);
    });
    this.$.main.addEventListener('hash', (event) => {
      this.emitEvent('application:sethash', event.detail);
    });
    this.$.main.addEventListener('openProject', (event) => {
      this.openProject(event.detail);
    });
    this.$.context.addEventListener('newgraph', (event) => {
      this.emitEvent('storage:save:graph', event.detail);
      if (!this.ctx.runtime || !this.ctx.runtime.definition || !this.ctx.runtime.definition.id) {
        return;
      }
      this.emitEvent('runtime:sendGraph', {
        runtime: this.ctx.runtime.definition.id,
        graph: event.detail,
        project: this.ctx.project,
      });
    });
    this.$.context.addEventListener('clear:runtimeevents', (event) => {
      if (!this.ctx.runtime || !this.ctx.runtime.definition || !this.ctx.runtime.definition.id) {
        return;
      }
      const clear = event.detail;
      clear.runtime = this.ctx.runtime.definition.id;
      if (this.ctx.graph && !clear.all) {
        clear.graph = this.ctx.graph.name || this.ctx.graph.properties.id;
      }
      delete clear.all;
      this.emitEvent('runtime:clearevents', clear);
    });
    this.$.context.addEventListener('clear:runtimepackets', (event) => {
      if (!this.ctx.runtime || !this.ctx.runtime.definition || !this.ctx.runtime.definition.id) {
        return;
      }
      const clear = event.detail;
      clear.runtime = this.ctx.runtime.definition.id;
      if (this.ctx.graph) {
        clear.graph = this.ctx.graph.name || this.ctx.graph.properties.id;
      }
      this.emitEvent('runtime:clearpackets', clear);
    });
    this.$.runtime.addEventListener('switchRuntime', (event) => {
      this.emitEvent('application:recreatestate', event.detail);
    });
    this.$.runtime.addEventListener('changed', (event) => {
      this.emitEvent('storage:save:runtime', event.detail);
    });
    this.$.runtime.addEventListener('start', (event) => {
      this.emitEvent('runtime:start', {
        runtime: event.detail.runtime,
        graph: event.detail.graph,
        project: this.ctx.project,
      });
    });
    this.$.runtime.addEventListener('stop', (event) => {
      this.emitEvent('runtime:stop', {
        runtime: event.detail.runtime,
        graph: event.detail.graph,
        project: this.ctx.project,
      });
    });
    this.$.runtime.addEventListener('reconnect', (event) => {
      this.emitEvent('runtime:reconnect', event.detail);
    });
    this.$.grapheditor.addEventListener('edges', (event) => {
      this.emitEvent('context:edges', event.detail);
    });
    this.$.grapheditor.addEventListener('nodes', (event) => {
      this.emitEvent('context:nodes', event.detail);
    });
    this.$.grapheditor.addEventListener('changed', (event) => {
      const ev = event;
      ev.detail.properties.changed = true;
      this.emitEvent('storage:save:graph', ev.detail);
    });
    this.$.grapheditor.addEventListener('graphChanges', (event) => {
      if (!this.ctx.runtime || !this.ctx.runtime.definition || !this.ctx.runtime.definition.id) {
        return;
      }
      this.emitEvent('runtime:sendGraphChanges', {
        runtime: this.ctx.runtime.definition.id,
        graph: this.ctx.graph,
        changes: event.detail,
      });
      this.triggerTests();
    });
    this.$.project.addEventListener('changed', (event) => {
      this.emitEvent('storage:save:project', event.detail);
    });
    this.$.project.addEventListener('newgraph', (event) => {
      this.emitEvent('storage:save:graph', event.detail);
      if (!this.ctx.runtime || !this.ctx.runtime.definition || !this.ctx.runtime.definition.id) {
        return;
      }
      this.emitEvent('runtime:sendGraph', {
        runtime: this.ctx.runtime.definition.id,
        graph: event.detail,
        project: this.ctx.project,
      });
    });
    this.$.project.addEventListener('newcomponent', (event) => {
      this.emitEvent('storage:save:component', event.detail);
      if (!this.ctx.runtime || !this.ctx.runtime.definition || !this.ctx.runtime.definition.id) {
        return;
      }
      this.emitEvent('runtime:sendComponent', {
        runtime: this.ctx.runtime.definition.id,
        component: event.detail,
      });
    });
    this.$.project.addEventListener('newspec', (event) => {
      this.emitEvent('storage:save:spec', event.detail);
    });
    this.$.project.addEventListener('sync', (event) => {
      this.emitEvent('github:sync:prepare', event.detail);
    });
    this.$.project.addEventListener('syncDecision', (event) => {
      this.emitEvent('github:sync:synchronize', event.detail);
    });
    this.$.project.addEventListener('deleteProject', (event) => {
      this.emitEvent('application:sethash', []);
      event.detail.graphs.forEach((graph) => {
        this.emitEvent('storage:delete:graph', graph);
      });
      event.detail.components.forEach((component) => {
        this.emitEvent('storage:delete:component', component);
      });
      event.detail.specs.forEach((spec) => {
        this.emitEvent('storage:delete:spec', spec);
      });
      this.emitEvent('storage:delete:project', event.detail);
    });
    this.$.project.addEventListener('hash', (event) => {
      this.emitEvent('application:sethash', event.detail);
    });
    this.$.main.addEventListener('deleteProject', (event) => {
      this.emitEvent('application:sethash', []);
      event.detail.graphs.forEach((graph) => {
        this.emitEvent('storage:delete:graph', graph);
      });
      event.detail.components.forEach((component) => {
        this.emitEvent('storage:delete:component', component);
      });
      event.detail.specs.forEach((spec) => {
        this.emitEvent('storage:delete:spec', spec);
      });
      this.emitEvent('storage:delete:project', event.detail);
    });
    this.$.main.addEventListener('deleteRuntime', (event) => {
      this.emitEvent('flowhub:runtimes:remove', event.detail);
    });
    this.$.main.addEventListener('deleteRepo', (event) => {
      this.emitEvent('flowhub:projects:remove', event.detail);
      if (this.ctx.remoteProjects) {
        // Since remote projects are not updated via normal flow, we can
        // directly remove it from view
        this.splice('ctx.remoteProjects', this.ctx.remoteProjects.indexOf(event.detail), 1);
      }
    });
    this.$.componenteditor.addEventListener('changed', (event) => {
      this.emitEvent('storage:save:component', event.detail);
      if (!this.ctx.runtime || !this.ctx.runtime.definition || !this.ctx.runtime.definition.id) {
        return;
      }
      this.emitEvent('runtime:sendComponent', {
        runtime: this.ctx.runtime.definition.id,
        component: event.detail,
      });
      this.triggerTests();
    });
    this.$.componenteditor.addEventListener('specschanged', (event) => {
      this.emitEvent('storage:save:spec', event.detail);
      this.emitEvent('runtime:sendComponent', {
        runtime: this.ctx.runtime.definition.id,
        component: this.ctx.component,
      });
      this.triggerTests();
    });
    this.$.search.addEventListener('search:library', (event) => {
      this.emitEvent('context:search_library', event.detail);
    });
    this.$.search.addEventListener('search:graph', (event) => {
      this.emitEvent('context:search_graph', event.detail);
    });
    this.$.search.addEventListener('hash', (event) => {
      this.emitEvent('application:sethash', event.detail);
    });
    this.$.library.addEventListener('result', (event) => {
      this.emitEvent('context:search_library_result', { searchLibraryResult: event.detail });
    });
    this.$.search.addEventListener('deleteGraph', (event) => {
      const { project } = this.ctx;
      this.emitEvent('storage:delete:graph', event.detail);
      if (project && project.graphs.indexOf(event.detail) !== -1) {
        this.splice('ctx.project.graphs', project.graphs.indexOf(event.detail), 1);
      }
      if (!project.graphs.length && !project.components.length) {
        // Empty project, remove
        this.emitEvent('storage:delete:project', project);
        // Go home
        this.emitEvent('application:sethash', []);
      } else {
        this.openProject(project);
      }
    });
    this.$.search.addEventListener('deleteComponent', (event) => {
      const { project } = this.ctx;
      if (!project || !project.components) {
        return;
      }
      const component = event.detail;
      const index = project.components.indexOf(component);
      if (index !== -1) {
        this.splice('ctx.project.components', index, 1);
      }
      this.emitEvent('storage:delete:component', component);
      if (!project.graphs.length && !project.components.length) {
        // Empty project, remove
        this.emitEvent('storage:delete:project', project);
        // Go home
        this.emitEvent('application:sethash', []);
      } else {
        this.openProject(project);
      }
    });
    this.$.search.addEventListener('specschanged', (event) => {
      this.emitEvent('storage:save:spec', event.detail);
      this.triggerTests();
    });
    this.set('$.library.editor', this.$.grapheditor);
    this.set('$.journal.editor', this.$.grapheditor);
    this.set('$.context.editor', this.$.grapheditor);
    this.set('$.packets.editor', this.$.grapheditor);
    this.set('$.search.editor', this.$.grapheditor);
    this.set('$.runtime.panel', this.$.context.$.fixed);
    this.set('$.packets.panel', this.$.context.$.contextsection);
    this.set('$.search.panel', this.$.context.$.contextsection);
  },

  updated(context) {
    if (context.state) {
      switch (context.state) {
        case 'error': {
          this.showError(context);
          break;
        }
        case 'ok': {
          this.hideAlertSoon();
          break;
        }
        case 'loading': {
          this.showProgress(context);
          break;
        }
        default: {
          break;
        }
      }
    }

    // Update local state with incoming data
    Object.keys(context).forEach((key) => {
      if (this.clearContextFirst.indexOf(key) !== -1) {
        // Clear arrays first so Polymer knows there are changes
        this.set(`ctx.${key}`, context[key].slice(0));
        if (key === 'projects') {
          // Projects are complex objects that need a full notify
          for (let i = 0; i < this.ctx.projects.length; i += 1) {
            const project = this.ctx.projects[i];
            this.set(`ctx.projects.${i}`, {});
            this.set(`ctx.projects.${i}`, project);
            if (this.ctx.project && this.ctx.project.id === project.id) {
              this.set('ctx.project', {});
              this.set('ctx.project', project);
            }
          }
        }
        return;
      }
      this.set(`ctx.${key}`, context[key]);
    });
    if (context.user && context.user['flowhub-theme']) {
      this.theme = context.user['flowhub-theme'];
    }
    if (context.searchLibraryResult) {
      this.$.search.libraryResults(this.ctx.searchLibraryResult);
    }
    if (context.searchGraphResult) {
      this.$.search.graphResults(this.ctx.searchGraphResult);
    }
    if (context.syncOperation !== undefined) {
      this.$.project.confirm(context.syncOperation);
      return;
    }
    if (context.componentLibrary) {
      Object.keys(this.$.grapheditor.$.graph.library).forEach((libKey) => {
        delete this.$.grapheditor.$.graph.library[libKey];
      });
      context.componentLibrary.forEach((def) => {
        this.$.grapheditor.registerComponent(def);
      });
      this.set('ctx.componentLibrary', null);
    }
    if (this.ctx.suites) {
      this.$.runtime.showTests(this.ctx.suites);
    }
    if (this.ctx.state === 'loading') {
      return;
    }
    if (this.ctx.state === 'error') {
      this.showError(this.ctx);
      return;
    }
    if (context.graphs) {
      if (context.graphs.length) {
        const oldGraph = this.ctx.graph;
        this.set('ctx.graph', context.graphs[context.graphs.length - 1]);
        if (oldGraph !== this.ctx.graph) {
          setTimeout(() => {
            this.emitEvent('context:graph', { graph: this.ctx.graph });
          }, 1);
        }
      } else {
        this.set('ctx.graph', null);
      }
    }
    if (this.ctx.graph || this.ctx.component) {
      this.set('$.main.open', false);
      const isReadOnly = projects.isReadOnly(this.ctx);
      this.set('$.search.readonly', isReadOnly);
      this.set('$.grapheditor.readonly', isReadOnly);
      this.set('$.context.readonly', isReadOnly);
      this.set('$.packets.readonly', isReadOnly);
    } else {
      this.set('$.main.open', true);
    }
  },

  showError(context) {
    if (context.error && context.error.message) {
      this.set('$.alert.message', context.error.message);
      this.set('$.alert.isError', true);
      this.set('$.alert.offerHTTPS', false);
      PolymerDom(this.$.alert).classList.add('show');
    }
  },

  showProgress(context) {
    if (context.state || context.offerHTTPS) {
      this.set('$.alert.message', context.state || '');
      this.set('$.alert.isError', false);
      this.set('$.alert.offerHTTPS', context.offerHTTPS || false);
      this.dontAutoHideAlert = context.dontAutoHideAlert || false;
      PolymerDom(this.$.alert).classList.add('show');
    }
  },

  triggerTests() {
    if (!this.ctx.runtime) {
      return;
    }
    this.emitEvent('runtime:runTests', {
      project: this.ctx.project,
      runtime: this.ctx.runtime.definition,
    });
  },

  hideAlert() {
    PolymerDom(this.$.alert).classList.remove('show');
  },

  hideAlertSoon() {
    if (this.dontAutoHideAlert) {
      return;
    }
    if (!PolymerDom(this.$.alert).classList.contains('show')) {
      return;
    }
    window.setTimeout(() => {
      this.hideAlert();
    }, 1300);
  },

  openProject(project) {
    projects.getProjectHash(project, (err, hash) => {
      if (err) {
        return;
      }
      this.emitEvent('application:sethash', hash);
    });
  },

  themeChanged(newTheme, oldTheme) {
    if (oldTheme) {
      PolymerDom(document.body).classList.remove(oldTheme);
    }
    PolymerDom(document.body).classList.add(this.theme);
  },
});
