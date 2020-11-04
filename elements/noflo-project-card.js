import { PolymerElement, html } from '@polymer/polymer';
import './noflo-card-styles';
import './noflo-icon';
import './the-graph-thumb';

class NoFloProjectCard extends PolymerElement {
  static get template() {
    return html`
    <style include="noflo-card-styles">
      the-graph-thumb {
        display: block;
        position: absolute;
        left: 100px;
        top: -20px;
      }
    </style>
    <the-graph-thumb graph="[[_getMainGraph(project.main)]]" width="200" height="120"></the-graph-thumb>
    <button id="menubutton" title="Project menu" on-click="toggleMenu"><noflo-icon icon="[[menuicon]]"></noflo-icon></button>
    <template is="dom-if" if="[[menuopen]]">
    <ul id="menu">
      <template is="dom-if" if="[[project.repo]]">
      <li><button on-click="openGithub">View on GitHub</button></li>
      </template>
      <template is="dom-if" if="[[project.gist]]">
      <li><button on-click="openGithub">View Gist</button></li>
      </template>
      <li><button on-click="deleteProject">Delete project</button></li>
    </ul>
    </template>
    <h2>[[project.name]]</h2>
    <p><span>[[project.graphs.length]]</span>&nbsp;graphs, <span>[[project.components.length]]</span>&nbsp;components</p>
`;
  }

  static get is() {
    return 'noflo-project-card';
  }

  static get properties() {
    return {
      menuopen: {
        type: Boolean,
        value: false,
        observer: '_menuOpenChanged',
      },
      menuicon: {
        type: String,
        value: 'ellipsis-v',
      },
      project: {
        type: Object,
        value() {
          return {};
        },
      },
    };
  }

  toggleMenu(event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.menuopen) {
      this.menuopen = false;
      return;
    }
    this.menuopen = true;
  }

  openGithub(event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.project.repo && !this.project.gist) {
      return;
    }
    if (this.project.repo) {
      if (typeof ga === 'function') {
        ga('send', 'event', 'button', 'click', 'openGithub');
      }
      window.location = `https://github.com/${this.project.repo}`;
      return;
    }
    if (this.project.gist) {
      if (typeof ga === 'function') {
        ga('send', 'event', 'button', 'click', 'openGist');
      }
      window.location = `https://gist.github.com/${this.project.gist}`;
    }
  }

  deleteProject(event) {
    event.stopPropagation();
    event.preventDefault();
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'deleteProject');
    }
    this.dispatchEvent(new CustomEvent('deleteProject', {
      detail: this.project,
      composed: true,
      bubbles: true,
    }));
    this.menuopen = false;
  }

  _getMainGraph(main) {
    if (!main) {
      return null;
    }
    const mains = this.project.graphs.filter((graph) => {
      if (graph.properties.id !== main) {
        return false;
      }
      return true;
    });
    if (!mains.length) {
      return null;
    }
    return mains[0];
  }

  _menuOpenChanged() {
    if (this.menuopen) {
      this.menuicon = 'caret-down';
      return;
    }
    this.menuicon = 'ellipsis-v';
  }
}
customElements.define(NoFloProjectCard.is, NoFloProjectCard);
