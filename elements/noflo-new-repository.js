import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Add a new repository</h1>
      <div class="modal-content">
      <form>
        <label>
          GitHub repository name
          <input type="text" value="{{repo::input}}" placeholder="username/repository" required="">
        </label>
      </form>
      </div>
      <div class="toolbar">
        <button on-click="send" class\$="{{_computeClass(canSend)}}">Add</button>
        <a on-click="close">Cancel</a>
      </div>
    </div>
`,

  is: 'noflo-new-repository',

  properties: {
    canSend: {
      type: Boolean,
      value: false,
    },
    repo: {
      type: String,
      value: '',
      observer: 'repoChanged',
    },
    runtimes: { notify: true },
    token: {
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

  repoChanged() {
    this.canSend = false;
    if (this.repo && typeof this.repo === 'string') {
      const matched = this.repo.match(/^(git@github\.com:|https:\/\/github\.com\/)?(\S+\/\S+?(?=\.git|$))(\.git)?$/);
      if (!matched || !matched[2]) {
        return;
      }
      if (matched[2] !== this.repo) {
        // eslint-disable-next-line prefer-destructuring
        this.repo = matched[2];
      }
      this.canSend = true;
    }
  },

  send(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.repo) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'newRepository');
    }
    this.fire('new', this.repo);
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

  _computeClass(canSend) {
    return this.tokenList({ disabled: !canSend });
  },

  tokenList(obj) {
    const pieces = [];
    Object.keys(obj).forEach((key) => {
      if (obj[key]) {
        pieces.push(key);
      }
    });
    return pieces.join(' ');
  },
});
