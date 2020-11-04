import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-icon';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      table th {
        text-align: left;
      }
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Synchronize with <noflo-icon icon="github"></noflo-icon> <span>{{operation.repo}}</span></h1>
      <div class="modal-content">
      <template is="dom-if" if="{{statusText}}">
        <div>{{statusText}}</div>
      </template>
      <form>
        <table>
          <template is="dom-repeat" items="{{files}}" as="file">
          <tr>
            <th>{{file.path}}</th>
            <td>
              <select name="{{file.path}}" on-change="choose">
                <template is="dom-repeat" items="{{file.operations}}" as="op">
                <option value="[[op]]" selected\$="[[_isSelectedOp(file, op)]]">[[_getOperationLabel(op)]]</option>
                </template>
              </select>
            </td>
          </tr>
          </template>
        </table>
        <template is="dom-if" if="{{hasPush}}">
          <label>
            <span>Commit message</span>
            <input type="text" value="{{message::input}}" required="">
          </label>
        </template>
      </form>
      </div>
      <div class="toolbar">
        <button on-click="send" class\$="{{_computeClass(hasOp)}}">Synchronize</button>
        <a on-click="close">Cancel</a>
      </div>
    </div>
`,

  is: 'noflo-project-sync',

  properties: {
    files: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'filesChanged',
    },
    hasOp: {
      type: Boolean,
      value: true,
    },
    hasPush: {
      type: Boolean,
      value: false,
    },
    message: {
      type: String,
      value: '',
    },
    operation: {
      type: Object,
      value() {
        return {
          repo: '',
          push: [],
          pull: [],
          conflict: [],
          noop: [],
        };
      },
      observer: 'operationChanged',
    },
    statusText: {
      type: String,
      value: '',
    },
  },

  operationChanged() {
    if (!this.operation.push.length
      && !this.operation.pull.length
      && !this.operation.conflict.length) {
      this.statusText = 'All changes have been synchronized';
      this.hasOp = false;
    }
    this.hasPush = false;
    this.operation.conflict.forEach((entry) => {
      this.push('files', {
        path: entry.path,
        operation: 'noop',
        operations: ['push', 'pull', 'noop'],
      });
    });
    this.operation.push.forEach((entry) => {
      this.push('files', {
        path: entry.path,
        operation: 'noop',
        operations: ['push', 'noop'],
      });
    });
    this.operation.pull.forEach((entry) => {
      this.push('files', {
        path: entry.path,
        operation: 'pull',
        operations: ['pull', 'noop'],
      });
    });
    this.filesChanged();
  },

  filesChanged() {
    let pushes = false;
    let ops = false;
    this.files.forEach((file) => {
      if (file.operation === 'push') {
        pushes = true;
        ops = true;
      }
      if (file.operation === 'pull') {
        ops = true;
      }
    });
    this.hasPush = pushes;
    this.hasOp = ops;
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  send(event) {
    if (event) {
      event.preventDefault();
    }
    if (this.hasPush && !this.message) {
      return;
    }
    const originalConflicts = this.operation.conflict;
    const originalPushes = this.operation.push;
    const originalPulls = this.operation.pull;
    this.set('operation.conflict', []);
    this.set('operation.pull', []);
    this.set('operation.push', []);
    const checkOps = (entry) => {
      this.files.forEach((file) => {
        if (file.path !== entry.path) {
          return;
        }
        if (file.operation === 'push') {
          this.push('operation.push', entry);
        }
        if (file.operation === 'pull') {
          this.push('operation.pull', entry);
        }
      });
    };
    originalConflicts.forEach(checkOps);
    originalPushes.forEach(checkOps);
    originalPulls.forEach(checkOps);
    this.set('operation.message', this.message);
    this.fire('sync', this.operation);
    this.close();
  },

  choose(event) {
    let index = null;
    let f = null;
    this.files.forEach((file, idx) => {
      if (file.path === event.currentTarget.name) {
        index = idx;
        f = file;
      }
    });
    if (index === null) {
      return;
    }
    this.splice('files', index, 1, {
      id: event.currentTarget.name,
      path: f.path,
      operation: event.currentTarget.value,
      operations: f.operations,
    });
    this.filesChanged();
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

  _computeClass(hasOp) {
    return this.tokenList({ disabled: !hasOp });
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

  _getOperationLabel(op) {
    if (op === 'push') {
      return 'Push';
    }
    if (op === 'pull') {
      return 'Pull';
    }
    if (op === 'noop') {
      return 'Ignore';
    }
    return op;
  },

  _isSelectedOp(file, op) {
    if (op === file.operation) {
      return true;
    }
    return false;
  },
});
