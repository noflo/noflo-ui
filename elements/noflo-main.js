import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import noflo from 'noflo';
import runtimeInfo from '../runtimeinfo';
import './noflo-account';
import './noflo-new-project';
import './noflo-new-repository';
import './noflo-new-runtime';
import './noflo-project-card';
import './noflo-repo-card';
import './noflo-runtime-card';
import './noflo-icon';

Polymer({
  _template: html`
    <style>
      :host {
        background-color: hsl(190, 90%, 45%);
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        transition: height 1s ease-in-out;
        display: block;
      }
      section {
        display: block;
        position: relative;
        padding-left: 72px;
        padding-right: 72px;
      }
      section > h2 {
        font-size: 17px;
        line-height: 36px;
        margin-top: 36px;
        height: 36px;
        color: white;
        text-shadow: 0 1px 0 hsl(190, 100%, 40%);
        text-transform: none;
      }
      section > h2 small {
        font-size: 10px;
        text-transform: uppercase;
        color: hsl(189, 50%, 25%);
      }
      ul.tabs {
        position: absolute;
        display: inline-block;
        top: 0px;
        left: calc(50% - 133px);
        margin: 0px;
        padding: 0px;
        list-style: none;
        padding: 1px;
      }
      ul.tabs li {
        display: inline;
        line-height: 36px;
        font-size: 13px;
        color: hsl(189, 50%, 25%);
        text-decoration: none;
        padding-left: 36px;
        padding-right: 36px;
        cursor: pointer;
      }
      ul.tabs li.selected {
        border: none;
        border-radius: 3px;
        background-color: rgba(0, 42, 51, 0.498039);
        color: white;
        border-radius: 3px;
        padding-top: 8px;
        padding-bottom: 9px;
        cursor: default;
      }
      ul.projects {
        padding: 0px;
        margin-top: 36px;
        margin-bottom: 36px;
        margin-left: -18px;
        margin-right: -18px;
        list-style: none;
      }
      ul.projects li {
        width: 216px;
        height: 105px;
        overflow: hidden;
        display: inline-block;
        text-align: center;
        background-color: var(--noflo-ui-background);
        color: var(--noflo-ui-text);
        border-radius: 3px;
        margin-right: 18px;
        margin-left: 18px;
        margin-bottom: 36px;
        position: relative;
        cursor: pointer;
      }
      ul.projects li.add,
      ul.projects li.plan {
        background-color: var(--noflo-ui-text);
        color: var(--noflo-ui-background);
        cursor: default;
      }
      ul.projects li.remote {
        cursor: default;
      }
      section button,
      section #cta {
        background-color: transparent;
        color: hsl(189, 50%, 25%);
        font-size: 13px;
        border-radius: 3px;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        height: 36px;
        border: none;
        padding-left: 13px;
        padding-right: 13px;
        cursor: pointer;
      }
      ul.projects li button,
      ul.projects li #cta {
        display: block;
        border: 1px solid hsl(189, 50%, 25%);
        position: absolute;
        right: 18px;
        top: 36px;
      }
      ul.projects li h2 {
        position: absolute;
        top: 36px;
        line-height: 36px;
        width: 150px;
        text-transform: none;
        font-size: 12px;
        text-align: left;
        white-space: nowrap;
        left: 18px;
        padding: 0px;
        margin: 0px;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      ul.projects li p {
        position: absolute;
        top: 53px;
        left: 18px;
        width: 150px;
        text-transform: uppercase;
        font-size: 10px;
        text-align: left;
        max-height: 36px;
        overflow: hidden;
        color: hsl(189, 11%, 50%);
      }
      ul.projects li.plan p {
        width: 100px;
        font-size: 9px;
      }
      ul.projects li a {
        color: var(--noflo-ui-background);
        text-decoration: none;
      }
    </style>
    <noflo-account id="mainaccount" user="[[user]]" theme="[[theme]]"></noflo-account>
      <section id="projects">
        <h2>Projects
          <template is="dom-if" if="[[_isLocalProjects(projectList)]]">
          <small>[[projects.length]]</small>
          </template>
          <template is="dom-if" if="[[!_isLocalProjects(projectList)]]">
          <small>[[numberOfRemoteProjects(remoteProjects)]]</small>
          <button on-click="fetchGithub">
            <noflo-icon id="fetchgithub" icon="refresh"></noflo-icon>
          </button>
          </template>
        </h2>
        <ul class="tabs">
          <li on-click="openLocal" class\$="[[_isSelectedView('local', projectList)]]">On device</li>
          <template is="dom-if" if="[[_canGithub(user)]]">
          <li on-click="openGithub" class\$="[[_isSelectedView('github', projectList)]]">GitHub</li>
          </template>
        </ul>
        <ul class="projects">
          <template is="dom-if" if="[[_isLocalProjects(projectList)]]">
          <li class="add">
            <h2>New project</h2>
            <button id="newproject" on-click="newProject">Create</button>
          </li>
          <template is="dom-repeat" items="[[projects]]" as="project">
            <li on-click="openProject" data-id\$="[[project.id]]">
              <noflo-project-card project="[[project]]"></noflo-project-card>
            </li>
          </template>
          </template>
          <template is="dom-if" if="[[!_isLocalProjects(projectList)]]">
          <li class="add">
            <h2>Add a repository</h2>
            <button id="newrepository" on-click="newRepository">Add</button>
          </li>
          <template is="dom-if" if="[[_isFree(user)]]">
          <li class\$="[[_planClass(user)]]">
            <h2>Flowhub free</h2>
            <p>Access only to public GitHub repositories.</p>
            <form method="post" action="https://plans.flowhub.io/auth/flowhub">
              <input type="hidden" name="username" value="[[user.github-username]]">
              <input type="hidden" name="password" value="[[user.flowhub-token]]">
              <input type="submit" id="cta" value="Upgrade">
            </form>
          </li>
          </template>
          <template is="dom-repeat" items="[[remoteProjects]]" as="project" filter="filterRemoteProjects">
            <li class="remote" on-click="downloadProject" data-repo\$="[[project.repo]]">
              <noflo-repo-card project="[[project]]"></noflo-repo-card>
            </li>
          </template>
          </template>
        </ul>
      </section>
    <section id="runtimes">
      <h2>
        Runtimes <small><span>[[numberOfAvailableRuntimes(runtimes)]]</span> / <span>[[runtimes.length]]</span></small>
        <template is="dom-if" if="[[_canFlowhub(user)]]">
        <button on-click="fetchRuntimes">
          <noflo-icon id="fetchruntimes" icon="refresh"></noflo-icon>
        </button>
        </template>
      </h2>
      <ul class="projects">
        <li class="add">
          <h2>New runtime</h2>
          <button on-click="newRuntime">Register</button>
        </li>

        <template is="dom-repeat" items="[[runtimes]]" as="runtime" filter="filterAvailableRuntimes">
          <li on-click="openRuntime" data-id\$="[[runtime.id]]" data-protocol\$="[[runtime.protocol]]">
            <noflo-runtime-card runtime="[[runtime]]"></noflo-runtime-card>
          </li>
        </template>
      </ul>
    </section>
    <section id="examples">
      <h2>
        Examples
      </h2>
      <ul class="projects">
        <template is="dom-repeat" items="[[_getExamples(projects, runtimes)]]" as="example">
        <li on-click="openExample" class="example" data-id\$="[[example.id]]">
          <h2>[[example.label]]</h2>
          <p>[[example.address]]</p>
        </li>
        </template>
      </ul>
    </section>
`,

  is: 'noflo-main',

  properties: {
    help: { value: null },
    open: {
      type: Boolean,
      value: true,
      notify: true,
      observer: 'openChanged',
    },
    projectList: {
      type: String,
      value: 'local',
    },
    projects: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    remoteProjects: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    runtimes: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    theme: {
      type: String,
    },
    user: {
      type: Object,
      value() {
        return {};
      },
      notify: true,
    },
  },

  attached() {
    this.openChanged();
    this.help = PolymerDom(document).querySelector('noflo-help');
  },

  openChanged() {
    if (String(this.open) === 'true') {
      // Make main visible
      this.set('style.height', '100%');
      return;
    }
    this.set('style.height', '0px');
  },

  openLocal(event) {
    if (event) {
      event.preventDefault();
    }
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    this.projectList = 'local';
  },

  openGithub(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    if (!this._canGithub(this.user)) {
      return;
    }
    event.preventDefault();
    this.projectList = 'github';
    if (!this.remoteProjects || this.remoteProjects.length === 0) {
      setTimeout(() => {
        this.fetchGithub();
      }, 1);
    }
  },

  downloadProject(event) {
    event.preventDefault();
    event.stopPropagation();
    const repo = event.currentTarget.getAttribute('data-repo');
    const repoParts = repo.split('/');
    const branch = 'master';
    this.fire('downloadProject', {
      org: repoParts[0],
      repo: repoParts[1],
      branch,
    });
    this.openLocal();
  },

  fetchGithub(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this._canGithub(this.user)) {
      return;
    }
    this.fire('fetchRemote', true);
  },

  numberOfRemoteProjects(remoteProjects) {
    return remoteProjects.filter(this.filterRemoteProjects.bind(this)).length;
  },

  filterRemoteProjects(remoteProject) {
    if (!this.projects) {
      return true;
    }
    for (let i = 0; i < this.projects.length; i += 1) {
      if (this.projects[i].repo === remoteProject.repo) {
        // We already have this project checked out
        return false;
      }
    }
    return true;
  },

  numberOfAvailableRuntimes(runtimes) {
    return runtimes.filter(this.filterAvailableRuntimes.bind(this)).length;
  },

  filterAvailableRuntimes(runtime) {
    if (!runtime) {
      return false;
    }
    if (!runtime.seen) {
      // Non-persistent runtime, don't show
      return false;
    }
    if (runtime.protocol === 'opener' && !window.opener) {
      // Can't use opener runtimes if opener is not defined
      return false;
    }
    if (typeof runtime.seen !== 'object') {
      // eslint-disable-next-line no-param-reassign
      runtime.seen = new Date(runtime.seen);
    }
    const now = new Date();
    // eslint-disable-next-line no-param-reassign
    runtime.seenHoursAgo = Math.floor((now - runtime.seen) / (60 * 60 * 1000));
    return true;
  },

  _getExamples(projects, runtimes) {
    const runtimeTypes = [];
    // Find examples for current runtime types
    runtimes.forEach((runtime) => {
      if (!runtime.type) {
        return;
      }
      if (runtimeTypes.indexOf(runtime.type) === -1) {
        runtimeTypes.push(runtime.type);
      }
    });
    const examples = [];
    runtimeTypes.forEach((type) => {
      if (!runtimeInfo[type]) {
        return;
      }
      const typeExamples = runtimeInfo[type].examples;
      if (!typeExamples) {
        return;
      }
      Object.keys(typeExamples).forEach((key) => {
        if (typeExamples[key].ssl && window.location.protocol !== 'https:') {
          // Skip examples that require SSL when on HTTP
          return;
        }
        examples.push(typeExamples[key]);
      });
    });
    const seen = [];
    return examples.filter((example) => {
      if (seen.indexOf(example.id) !== -1) {
        return false;
      }
      seen.push(example.id);
      const local = projects.filter((project) => {
        if (project.gist === example.id) {
          return true;
        }
        return false;
      });
      if (!local.length) {
        return true;
      }
      return false;
    });
  },

  fetchRuntimes() {
    if (!this._canFlowhub(this.user)) {
      return;
    }
    this.fire('fetchRuntimes', true);
  },

  openProject(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    let project = null;
    this.projects.forEach((p) => {
      if (p.id === event.currentTarget.getAttribute('data-id')) {
        project = p;
      }
    });
    if (!project) {
      return;
    }
    if (project.runtime) {
      const matchingRuntime = this.runtimes.filter(this.filterAvailableRuntimes).filter((rt) => {
        if (rt.id === project.runtime) {
          return true;
        }
        return false;
      });
      if (!matchingRuntime.length) {
        // Runtime for this project is not available
        return;
      }
    }
    this.fire('openProject', project);
  },

  openRuntime(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    if (event.currentTarget.getAttribute('data-protocol') === 'iframe') {
      return;
    }
    this.fire('hash', [
      'runtime',
      event.currentTarget.getAttribute('data-id'),
    ]);
  },

  openExample(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    this.fire('hash', [
      'gist',
      event.currentTarget.getAttribute('data-id'),
    ]);
  },

  newProject(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    const dialog = document.createElement('noflo-new-project');
    dialog.projects = this.projects;
    dialog.runtimes = this.runtimes;
    PolymerDom(document.body).appendChild(dialog);
    dialog.addEventListener('new', (ev) => {
      const project = ev.detail;
      const graph = new noflo.Graph('main');
      const graphId = `${project.id}/main`;
      graph.setProperties({
        id: graphId,
        project: project.id,
        environment: { type: project.type },
        main: true,
      });
      project.graphs.push(graph);
      project.main = graphId;
      this.fire('newgraph', graph);
      this.fire('newproject', project);
    });
  },

  newRepository(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    const dialog = document.createElement('noflo-new-repository');
    dialog.addEventListener('new', (ev) => {
      const repo = ev.detail;
      const repoParts = repo.split('/');
      const branch = 'master';
      this.fire('downloadProject', {
        org: repoParts[0],
        repo: repoParts[1],
        branch,
      });
      setTimeout(() => {
        this.openLocal();
      }, 1);
    });
    PolymerDom(document.body).appendChild(dialog);
  },

  newRuntime(event) {
    event.preventDefault();
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    const dialog = document.createElement('noflo-new-runtime');
    dialog.addEventListener('addRuntime', (ev) => {
      this.fire('newruntime', ev.detail);
    });
    dialog.user = this.user;
    PolymerDom(document.body).appendChild(dialog);
  },

  _isLocalProjects(projectList) {
    return projectList === 'local';
  },

  _canGithub(user) {
    if (user && user['github-token']) {
      return true;
    }
    return false;
  },

  _canFlowhub(user) {
    if (user && user['flowhub-token']) {
      return true;
    }
    return false;
  },

  _isSelectedView(view, list) {
    if (list === view) {
      return 'selected';
    }
    return '';
  },

  _isFree(user) {
    return user['flowhub-plan'] === 'free';
  },

  _planClass(user) {
    return `plan ${user['flowhub-plan']}`;
  },
});
