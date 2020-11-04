import { PolymerElement, html } from '@polymer/polymer';
import './noflo-card-styles';
import './noflo-icon';

class NoFloRepoCard extends PolymerElement {
  static get template() {
    return html`
    <style include="noflo-card-styles">
      #repoicon {
        font-size: 72px;
        position: absolute;
        right: -8px;
        top: 9px;
        color: hsla(185, 100%, 75%, 0.2);
        text-decoration: none;
      }
    </style>
    <noflo-icon id="repoicon" icon="[[getRepoIcon(project)]]"></noflo-icon>
    <button id="menubutton" title="Project menu" on-click="toggleMenu"><noflo-icon icon="[[menuicon]]"></noflo-icon></button>
    <template is="dom-if" if="[[menuopen]]">
    <ul id="menu">
      <template is="dom-if" if="[[project.repo]]">
      <li><button on-click="openGithub">View on GitHub</button></li>
      </template>
      <li><button on-click="deleteRepo">Remove from \$NOFLO_APP_NAME</button></li>
    </ul>
    </template>
    <h2>[[project.repo]]</h2>
    <template is="dom-if" if="[[project.private]]">
    <p>Private repository</p>
      <template is="dom-if" if="[[!_isFree(user)]]">
      </template>
    </template>
    <template is="dom-if" if="[[!project.private]]">
    <p>Public repository</p>
    </template>
`;
  }

  static get is() {
    return 'noflo-repo-card';
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
    if (!this.project.repo) {
      return;
    }
    if (this.project.repo) {
      if (typeof ga === 'function') {
        ga('send', 'event', 'button', 'click', 'openGithub');
      }
      window.location = `https://github.com/${this.project.repo}`;
    }
  }

  deleteRepo(event) {
    event.stopPropagation();
    event.preventDefault();
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'deleteRepo');
    }
    this.dispatchEvent(new CustomEvent('deleteRepo', {
      detail: this.project,
      composed: true,
      bubbles: true,
    }));
    this.menuopen = false;
  }

  _menuOpenChanged() {
    if (this.menuopen) {
      this.menuicon = 'caret-down';
      return;
    }
    this.menuicon = 'ellipsis-v';
  }

  getRepoIcon() {
    return 'github';
  }
}
customElements.define(NoFloRepoCard.is, NoFloRepoCard);
