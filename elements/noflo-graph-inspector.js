import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import collections from '../src/collections';
import urls from '../src/urls';
import runtime from '../src/runtime';
import './noflo-type-selector';
import './noflo-icon';
import './noflo-icon-selector';
import './noflo-modal-styles';
import './codemirror-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles codemirror-styles">
      .CodeMirror {
        height: 100%;
        cursor: text;
      }
      .CodeMirror-scroll {
        height: 100%;
      }
      textarea {
        height: 144px;
      }
      .editable-title {
        font-size: 17px;
        line-height: 36px;
        margin: 0px;
        padding: 0px;
        margin-bottom: 18px;
        background-color: var(--noflo-ui-background-shadow);
        color: var(--noflo-ui-text);
      }
      p {
        font-size: 13px;
        line-height: 18px;
      }
      p a, label a {
        color: rgb(0, 127, 153);
        text-decoration: none;
      }
      div.hidden {
        display: none;
      }
      a#download {
        position: absolute;
        right: 36px;
        top: 36px;
        width: 36px;
        display: block;
        height: 36px;
        line-height: 36px;
        background-color: rgb(0, 127, 153);
        text-align: center;
        border-radius: 6px;
        color: white;
      }
      button.delete {
        position: absolute;
        right: 36px;
        border: 0px solid hsla( 0, 98%, 46%, .8) !important;
        color: hsla( 0, 98%, 46%, .8) !important;
      }
      ul.tabs {
        display: block;
        margin: 0px;
        padding: 0px;
        list-style: none;
        padding: 1px;
        text-align: center;
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
    </style>
    <div class="modal-container" on-click="bgClick">
      <input type="text" on-keydown="checkUpdateName" on-blur="updateName" class="editable-title" value="{{getName(graph)}}">
      <template is="dom-if" if="{{downloadUrl}}">
        <a id="download" download="{{_computeDownload(graph)}}" href\$="{{downloadUrl}}">
          <noflo-icon icon="download"></noflo-icon>
        </a>
      </template>
      <div class="modal-content">
      <template is="dom-if" if="{{isMain}}">
      <p>Main graph in project <span>{{project.name}}</span>.</p>
      </template>
      <template is="dom-if" if="{{inGraph.length}}">
      <p>Used as subgraph in
      <template is="dom-repeat" items="{{inGraph}}" as="parent">
        <a href\$="{{_computeHref(parent, project)}}">
          <span>{{getName(parent)}}</span>
        </a>
      </template>
      </p>
      </template>
      <ul class="tabs">
        <li id="properties" on-click="setView" class\$="{{_computeClass(view)}}">Properties</li>
        <template is="dom-if" if="{{_computeIf(type)}}">
        <li id="html" on-click="setView" class\$="{{_computeClass5(view)}}">HTML</li>
        </template>
        <template is="dom-if" if="{{spec}}">
        <li id="tests" on-click="setView" class\$="{{_computeClass6(view)}}">Tests</li>
        </template>
      </ul>
      <div class\$="{{_computeClass2(view)}}">
      <label>
        <span>Description</span>
        <input type="text" value="{{description::input}}">
      </label>
      <label>
        Icon
        <noflo-icon-selector selected="{{icon}}"></noflo-icon-selector>
      </label>
      <label>
        <span>Type</span>
        <noflo-type-selector type="{{type}}" runtimes="{{runtimes}}"></noflo-type-selector>
      </label>
      </div>
      <div class\$="{{_computeClass3(view)}}">
      <label id="html_editor">
        <span>Preview contents</span>
      </label>
      </div>
      <div class\$="{{_computeClass4(view)}}">
      <label id="tests_editor">
        <span>Tests</span>
      </label>
      </div>
      </div>
      <div class="toolbar">
        <button on-click="save">Save</button>
        <a on-click="close">Cancel</a>
        <button class="delete" on-click="delete">Delete</button>
      </div>
    </div>
`,

  is: 'noflo-graph-inspector',

  properties: {
    description: {
      type: String,
      value: '',
    },
    downloadUrl: {
      type: String,
      value: '',
    },
    graph: {
      value: null,
      notify: true,
    },
    icon: {
      type: String,
      value: '',
    },
    inGraph: {
      type: Array,
      value() {
        return [];
      },
    },
    isMain: {
      type: Boolean,
      value: false,
    },
    preview: {
      type: String,
      value: '',
    },
    project: { value: null },
    runtimes: {
      type: Array,
      value() {
        return [];
      },
    },
    spec: {
      value: null,
    },
    theme: {
      type: String,
      value: 'dark',
      observer: 'themeChanged',
    },
    type: {
      type: String,
      value: '',
    },
    view: {
      type: String,
      value: 'properties',
      observer: 'viewChanged',
    },
  },

  checkUpdateName(event) {
    if (event.keyCode === 13) {
      // Enter
      event.preventDefault();
      this.updateName(event);
    }
  },

  updateName(event) {
    this.set('graph.name', event.currentTarget.value);
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
    if (!this.graph) {
      return;
    }
    this.description = this.graph.properties.description;
    this.icon = this.graph.properties.icon || 'cog';
    this.type = runtime.getGraphType(this.graph);
    this.view = 'properties';
    this.inGraph = [];
    this.isMain = false;

    if (this.project) {
      if (this.graph.properties.main) {
        this.isMain = true;
      } else {
        this.project.graphs.forEach((graph) => {
          graph.nodes.forEach((node) => {
            if (node.component === collections.unnamespace(this.graph.name)
            || node.component === collections.namespace(this.graph.name, this.project.namespace)) {
              this.push('inGraph', graph);
            }
          });
        });
      }
      this.project.specs.forEach((spec) => {
        if (collections.unnamespace(spec.name) === collections.unnamespace(this.graph.name)) {
          this.spec = spec;
        }
      });
      if (!this.spec) {
        this.spec = {
          name: collections.unnamespace(this.graph.name),
          changed: false,
          code: '',
          language: 'yaml',
          project: this.project.id,
          type: 'spec',
        };
        this.push('project.specs', this.spec);
      }
    }
    this.prepareHtmlEditor();
    this.prepareTestsEditor();
    this.prepareDownload();
  },

  prepareDownload() {
    if (!window.Blob || !window.URL) {
      return;
    }
    const graph = JSON.parse(JSON.stringify(this.graph));
    if (graph.properties) {
      delete graph.properties.sha;
      delete graph.properties.changed;
      delete graph.properties.project;
      delete graph.properties.id;
    }
    const blob = new Blob([JSON.stringify(graph, null, 4)], { type: 'application/json' });
    try {
      this.downloadUrl = URL.createObjectURL(blob);
    } catch (e) {
      // Ignore URL failure
    }
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  viewChanged() {
    if (this.view === 'html' && this.htmlEditor) {
      setTimeout(() => {
        this.htmlEditor.setSize(576 - 4, 288);
        this.htmlEditor.refresh();
        this.htmlEditor.focus();
      }, 1);
    }
    if (this.view === 'tests' && this.testsEditor) {
      setTimeout(() => {
        this.testsEditor.setSize(576 - 4, 288);
        this.testsEditor.refresh();
        this.testsEditor.focus();
      }, 1);
    }
  },

  getMirrorTheme() {
    if (this.theme === 'light') {
      return 'mdn-like';
    }
    return 'noflo';
  },

  themeChanged() {
    if (!this.htmlEditor || !this.testsEditor) {
      return;
    }
    this.htmlEditor.setOption('theme', this.getMirrorTheme());
    this.testsEditor.setOption('theme', this.getMirrorTheme());
  },

  prepareHtmlEditor() {
    if (this.type !== 'noflo-browser') {
      return;
    }
    this.htmlEditor = CodeMirror(this.$.html_editor, {
      lineNumbers: true,
      value: this.graph.properties.environment.content || '',
      language: 'htmlmixed',
      theme: this.getMirrorTheme(),
    });
  },

  prepareTestsEditor() {
    if (!this.spec) {
      return;
    }
    this.testsEditor = CodeMirror(this.$.tests_editor, {
      lineNumbers: true,
      value: this.spec.code || '',
      mode: this.getMirrorMode(this.spec.language),
      theme: this.getMirrorTheme(),
    });
  },

  getMirrorMode(language) {
    if (language === 'coffeescript' || language === 'javascript' || language === 'yaml') {
      return language;
    } if (language === 'c') {
      return 'text/x-csrc';
    } if (language === 'c++') {
      return 'text/x-c++src';
    } if (language === 'supercollider') {
      return 'text/x-stsrc';
    }
    // smalltalk-like
    return 'clike';
  },

  save() {
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'saveGraphProperties');
    }
    const env = JSON.parse(JSON.stringify(this.graph.properties.environment));
    if (this.htmlEditor) {
      this.preview = this.htmlEditor.getValue();
      env.content = this.preview;
    }
    if (this.testsEditor && this.spec) {
      const specCode = this.testsEditor.getValue();
      if (specCode !== this.spec.code) {
        this.set('spec.code', specCode);
        this.set('spec.changed', true);
        this.fire('specschanged', this.spec);
      }
    }
    env.type = this.type;
    this.graph.setProperties({
      environment: env,
      description: this.description,
      icon: this.icon,
    });
    this.close();
  },

  delete(event) {
    event.preventDefault();
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'deleteGraph');
    }
    this.fire('delete', this.graph);
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

  setView(event) {
    this.view = event.currentTarget.id;
  },

  listeners: { click: 'close' },

  _computeClass(view) {
    return this.tokenList({ selected: view === 'properties' });
  },

  _computeIf(type) {
    return type === 'noflo-browser';
  },

  _computeClass2(view) {
    return this.tokenList({ hidden: view !== 'properties' });
  },

  _computeClass3(view) {
    return this.tokenList({ hidden: view !== 'html' });
  },

  _computeClass4(view) {
    return this.tokenList({ hidden: view !== 'tests' });
  },

  _computeDownload(graph) {
    return `${collections.unnamespace(graph.name)}.json`;
  },

  _computeHref(parent, project) {
    const hash = urls.getGraphHash(parent.properties.id, project);
    return urls.hashToString(hash);
  },

  _computeClass5(view) {
    return this.tokenList({ selected: view === 'html' });
  },

  _computeClass6(view) {
    return this.tokenList({ selected: view === 'tests' });
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

  getName(entity) {
    return collections.unnamespace(collections.getName(entity));
  },
});
