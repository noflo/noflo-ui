import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { Journal } from 'fbp-graph';
import { IDBJournalStore } from '../src/JournalStore';
import './the-graph-nav';
import './noflo-icon';

Polymer({
  _template: html`
    <style>
      #controls {
        display: flex;
        justify-content: space-between;
        flex-direction: row;
        position: fixed;
        right: 0px;
        bottom: 36px;
        width: 288px;
        height: 144px;
        color: var(--noflo-ui-text-highlight);
        box-sizing: border-box;
        background-color: var(--noflo-ui-background) !important;
        background-image: radial-gradient(1px at 0px 0px, hsl(210, 50%, 60%) 0.5px, var(--noflo-ui-background) 1px);
        background-size: calc(100% - 1px);
        background-position: 0px -1px;
        border-top: 1px solid var(--noflo-ui-border);
      }
      #controls #buttons {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      #controls button {
        line-height: 36px;
        border: none;
        background-color: transparent;
        font-size: 14px;
        width: 36px;
        color: var(--noflo-ui-text-highlight);
        cursor: pointer;
      }
      #controls button.disabled {
        color: rgba(179, 222, 230, 0.2);
      }
    </style>
    <div id="controls">
      <the-graph-nav id="nav" width="252" height="144" graph="{{graph}}" hide="{{hidenav}}"></the-graph-nav>
      <div id="buttons">
      <template is="dom-if" if="{{graph}}">
        <button title="Undo" on-click="undo" class\$="{{_computeClass(canUndo)}}">
          <noflo-icon icon="undo"></noflo-icon>
        </button>
        <template is="dom-if" if="{{klay}}">
          <button title="Autolayout" class="autolayout" on-click="autolayout">
            <noflo-icon icon="magic"></noflo-icon>
          </button>
        </template>
        <button title="Redo" on-click="{{_computeClass2(canRedo)}}" class\$="{{_computeClass(canRedo)}}">
          <noflo-icon icon="repeat"></noflo-icon>
        </button>
      </template>
      </div>
    </div>
`,

  is: 'noflo-journal',

  properties: {
    canRedo: {
      type: Boolean,
      value: false,
    },
    canUndo: {
      type: Boolean,
      value: false,
    },
    db: {
      value: null,
      notify: true,
      observer: 'dbChanged',
    },
    editor: {
      value: null,
      notify: true,
      observer: 'editorChanged',
    },
    graph: {
      value: null,
      notify: true,
      observer: 'graphChanged',
    },
    component: {
      value: null,
      notify: true,
      observer: 'componentChanged',
    },
    hidenav: {
      type: Boolean,
      value: false,
      observer: 'hidenavChanged',
    },
    klay: {
      type: Boolean,
      value: false,
    },
    theme: {
      type: String,
      value: 'dark',
      notify: true,
      observer: 'themeChanged',
    },
    panel: { notify: true },
    returnTo: { value: null },
  },

  attached() {
    this.klay = true;
  },

  editorChanged(newEditor) {
    if (!newEditor) {
      return;
    }
    // Connect nav and editor together
    const { nav } = this.$;
    const editor = newEditor;
    editor.addEventListener('viewchanged', (e) => {
      nav.view = e.detail;
    });
    nav.addEventListener('panto', (e) => {
      const pan = e.detail;
      if (pan.x !== editor.pan[0] || pan.y !== editor.pan[1]) {
        editor.pan[0] = pan.x;
        editor.pan[1] = pan.y;
      }
    });
    nav.addEventListener('tap', () => {
      editor.triggerFit();
    });
  },

  graphChanged() {
    this.checkState();
    this.connectJournal();
  },

  dbChanged() {
    this.checkState();
    this.connectJournal();
  },

  componentChanged() {
    if (this.component && this.component.name) {
      this.hidenav = true;
    } else {
      this.hidenav = false;
    }
  },

  connectJournal() {
    if (!this.graph || !this.graph.on || !this.db) {
      return;
    }
    const positionedNodes = this.graph.nodes.filter((node) => {
      if (!node.metadata) {
        return false;
      }
      if (!node.metadata.x || !node.metadata.y) {
        return false;
      }
      return true;
    });
    if (this.graph.nodes.length && !positionedNodes.length) {
      setTimeout(() => {
        this.autolayout();
      }, 10);
    }
    if (!this.graph.properties.project || this.graph.journal || !this.db) {
      return;
    }
    // Initialize persistent journal whenever needed
    const store = new IDBJournalStore(this.graph, this.db);
    store.init(() => {
      this.graph.journal = new Journal(this.graph, undefined, store);
      this.checkState();
      this.graph.journal.store.on('transaction', () => {
        this.checkState();
      });
    });
  },

  checkState() {
    if (!this.graph || !this.graph.journal) {
      this.canUndo = false;
      this.canRedo = false;
      return;
    }
    this.canUndo = this.graph.journal.canUndo();
    this.canRedo = this.graph.journal.canRedo();
  },

  undo(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.graph || !this.graph.journal) {
      return;
    }
    this.graph.journal.undo();
    this.checkState();
  },

  redo(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.graph || !this.graph.journal) {
      return;
    }
    this.graph.journal.redo();
    this.checkState();
  },

  autolayout(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.graph || !this.klay) {
      return;
    }
    this.editor.triggerAutolayout();
  },

  themeChanged(newTheme) {
    this.$.nav.theme = newTheme;
  },

  hidenavChanged() {
    if (this.hidenav) {
      this.set('$.controls.style.width', '36px');
    } else {
      this.set('$.controls.style.width', '288px');
    }
  },

  _computeClass(canUndo) {
    return `undo ${this.tokenList({ disabled: !canUndo })}`;
  },

  _computeClass2(canRedo) {
    return `redo ${this.tokenList({ disabled: !canRedo })}`;
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
