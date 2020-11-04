import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import collections from '../src/collections';
import './noflo-menu';
import './noflo-search-graph-results';
import './noflo-search-library-results';
import './noflo-graph-inspector';
import './noflo-component-inspector';
import './noflo-icon';

Polymer({
  _template: html`
    <style>
      :host {
        background-color: var(--noflo-ui-background);
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        color: var(--noflo-ui-text);
        font-size: 10px;
        white-space: nowrap;
      }
      input {
        background-color: var(--noflo-ui-background);
        background-image: none;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        border: none;
        padding: 0px;
        padding-right: 10px;
        padding-left: 10px;
        color: var(--noflo-ui-text);
        width: 245px;
        height: 36px;
        display: inline;
      }
      button {
        width: 36px;
        height: 36px;
        margin: 0px;
        margin-left: -5px;
        padding: 0px;
        display: inline;
        display: inline;

        font-size: 10px;
        background-color: transparent;
        border: none;
        color: var(--noflo-ui-text);
        text-align: center;
        cursor: pointer;
      }

      :host(.overlay) #breadcrumb {
        width: calc(72px * 4);
        display: block;
      }
      #breadcrumb {
        position: relative;
        overflow: hidden;
        width: 0px;
        height: 71px;
        left: 0px;
        top: 0px;
        z-index: 1;

        /*transition: width 0.3s ease-in-out;*/
        display: none;
        /*box-sizing: border-box;*/

        background-color: var(--noflo-ui-background) !important;
        background-image: radial-gradient(1px at 0px 0px, hsl(210, 50%, 60%) 0.5px, var(--noflo-ui-background) 1px);
        background-size: calc(100% - 1px);
        background-position: 0px;
        border-bottom: 1px var(--noflo-ui-border) solid;

      }
      #breadcrumb noflo-icon.fa-search {
        position: absolute;
        line-height: 72px;
        right: 54px;
        font-size: 15px;
        color: var(--noflo-ui-text-highlight);
        cursor: text;
      }
      #breadcrumb #parentlink {
        line-height: 72px;
        display: inline-block;
        height: 72px;
        font-size: 15px;
        color: var(--noflo-ui-text-highlight);
      }
      #clear,
      #breadcrumb #graphinspector,
      #breadcrumb #componentinspector,
      #breadcrumb #readonly-lock {
        position: absolute;
        right: 9px;
        top: 0px;
        line-height: 72px;
        display: block;
        height: 72px;
        font-size: 15px;
        color: var(--noflo-ui-text-highlight);
      }
      #clear {
        color: var(--noflo-ui-border-highlight);
      }
      #breadcrumb h1 {
        display: inline-block;
        line-height: 72px;
        font-size: 15px;
        margin: 0px;
        padding: 0px;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 156px;
        font-weight: normal;
        padding-left: 18px;
        cursor: pointer;
      }
      :host(.overlay) #searchinput {
        display: none;
      }
      #searchinput {
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        display: block;
        position: absolute;
        top: 0px;
        left: 0px;
        border: none;
        padding: 0px;
        padding-right: 54px;
        padding-left: 18px;
        width: calc(72px * 3 - 1px);
        height: 71px;
        font-size: 12px;
        display: inline;
        background-image: radial-gradient(1px at 0px 0px, hsl(210, 50%, 60%) 0.5px, var(--noflo-ui-background) 1px);
        background-size: calc(100% - 1px);
        background-position: 0px;
        border-bottom: 1px var(--noflo-ui-border) solid;
        border-right: 1px var(--noflo-ui-border) solid;
        border-radius: none;
      }
      #searchinput #speech {
        color: var(--noflo-ui-text-highlight);
      }

      #searchinput.components {
        background-color: var(--noflo-ui-text);
        transition: background-color 0.3s linear;
      }
      #searchinput.components::-webkit-input-placeholder {
        color: hsl(190, 90%, 45%);
        color: var(--noflo-ui-text-highlight);
      }
      #searchinput.processes {
        background-color: hsl(161, 79%, 68%);
        transition: background-color 0.3s linear;
      }
      #searchinput.processes::-webkit-input-placeholder {
        color: hsl(190, 90%, 45%);
      }
    </style>
    <div id="breadcrumb" on-click="focus">
      <template is="dom-if" if="{{_canSearch(component, readonly)}}">
      <noflo-icon class="fa-search" icon="search"></noflo-icon>
      </template>
      <h1 title="Search">
        <template is="dom-if" if="{{_canGoBack(project, graphs, component)}}">
        <button id="parentlink" title="Back" on-click="goBack">
          <noflo-icon icon="angle-left"></noflo-icon>
        </button>
        </template>
        <template is="dom-if" if="{{_isGraph(component, graph)}}">
        <span>{{getName(graph)}}</span>
        </template>
        <template is="dom-if" if="{{_isComponent(component)}}">
        <span>{{getName(component)}}</span>
        </template>
      </h1>
      <template is="dom-if" if="{{_canInspectGraph(component, graph, readonly)}}">
      <button on-click="showGraphInspector" id="graphinspector" title="Graph properties">
        <noflo-icon icon="cog"></noflo-icon>
      </button>
      </template>
      <template is="dom-if" if="{{_canInspectComponent(component, graph, readonly)}}">
      <button on-click="showComponentInspector" id="componentinspector" title="Component properties">
        <noflo-icon icon="cog"></noflo-icon>
      </button>
      </template>
      <template is="dom-if" if="{{_isReadOnly(component, graph, readonly)}}">
      <button title="Read-only" id="readonly-lock">
        <noflo-icon icon="lock"></noflo-icon>
      </button>
      </template>
    </div>
    <input id="searchinput" placeholder="Search components" on-keydown="switchSearch" value="{{search::input}}" type="text" autocapitalize="off" autocorrect="off" x-webkit-speech="">
    <button id="clear" on-click="clearSearch" title="Clear search">
      <noflo-icon icon="times"></noflo-icon>
    </button>
`,

  is: 'noflo-search',

  properties: {
    component: {
      value: null,
      notify: true,
      observer: 'componentChanged',
    },
    editor: {
      value: null,
      notify: true,
    },
    graph: { value: null },
    graphInspector: { value: null },
    graphs: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'graphsChanged',
    },
    menuCard: { value: null },
    theme: {
      type: String,
      value: 'dark',
    },
    panel: { value: null },
    parentPath: {
      type: Array,
      value() {
        return [];
      },
    },
    project: { value: null },
    readonly: {
      type: Boolean,
      value: true,
      notify: true,
      observer: 'readonlyChanged',
    },
    results: { notify: true },
    resultsCard: { value: null },
    runtimes: {
      type: Array,
      value() {
        return [];
      },
    },
    search: {
      value: null,
      observer: 'searchChanged',
    },
    searchGraphResults: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'searchGraphResultsChanged',
    },
    searchLibrary: {
      type: Boolean,
      value: true,
    },
    searchLibraryResults: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'searchLibraryResultsChanged',
    },
  },

  readonlyChanged() {
    if (this.readonly) {
      this.blur();
    }
  },

  componentChanged() {
    if (!this.component || !this.component.name) {
      // Component nullified, ensure we recount graphs
      this.graphsChanged();
      return;
    }
    this.closeInspectors();
  },

  graphsChanged() {
    this.closeInspectors();
    this.blur();
  },

  closeInspectors() {
    if (this.graphInspector) {
      if (PolymerDom(this.graphInspector).parentNode) {
        PolymerDom(PolymerDom(this.graphInspector).parentNode)
          .removeChild(this.graphInspector);
      }
      this.graphInspector = null;
    }
    if (this.componentInspector) {
      if (PolymerDom(this.componentInspector).parentNode) {
        PolymerDom(PolymerDom(this.componentInspector).parentNode)
          .removeChild(this.componentInspector);
      }
      this.componentInspector = null;
    }
  },

  getParentPath(graphs, component) {
    const parentPath = [];
    if (!this.project) {
      return parentPath;
    }
    const findNode = (comp, graph) => {
      const matching = graph.nodes.filter((node) => {
        if (node.id === comp) {
          return true;
        }
        if (node.component === comp) {
          // Direct match
          return true;
        }
        if (!this.project) {
          return false;
        }
        if (node.component === `${this.project.namespace}/${comp}`) {
          return true;
        }
        if (node.component === `${this.project.id}/${comp}`) {
          return true;
        }
        return false;
      });
      return matching[0];
    };
    graphs.forEach((graph, idx) => {
      if (!component && idx >= graphs.length - 1) {
        return;
      }
      if (idx === 0) {
        parentPath.push(graph.properties.id);
        return;
      }
      const previous = graphs[idx - 1];
      const node = findNode(graph.name, previous);
      if (!node) {
        return;
      }
      parentPath.push(node.id);
    });
    return parentPath;
  },

  libraryResults(results) {
    this.set('searchLibraryResults', []);
    this.set('searchLibraryResults', results);
  },

  graphResults(result) {
    this.push('searchGraphResults', result);
  },

  attached() {
    PolymerDom(this).classList.add('gpu');
    this.blur();
  },

  focus() {
    if (this.readonly) {
      return;
    }
    if (this.component && this.component.name) {
      return;
    }
    PolymerDom(this).classList.remove('overlay');
    this.$.searchinput.focus();
    if (this.search === null) {
      // Show all
      this.search = '';
    }
  },

  blur() {
    this.clearResults();
    PolymerDom(this).classList.add('overlay');
  },

  toggle() {
    if (PolymerDom(this).classList.contains('overlay')) {
      this.focus();
      return;
    }
    this.blur();
  },

  clearResults() {
    this.set('searchGraphResults', []);
    this.set('searchLibraryResults', []);
  },

  clearSearch() {
    if (this.resultsCard) {
      PolymerDom(PolymerDom(this.resultsCard).parentNode).removeChild(this.resultsCard);
      this.resultsCard = null;
    }
    this.search = null;
    this.blur();
  },

  switchSearch(event) {
    if (event.keyIdentifier === 'U+0009') {
      event.preventDefault();
      this.searchLibrary = !this.searchLibrary;
      if (this.searchLibrary) {
        PolymerDom(this.$.searchinput).classList.add('components');
        PolymerDom(this.$.searchinput).classList.remove('processes');
        this.set('$.searchinput.placeholder', 'Search components');
      } else {
        PolymerDom(this.$.searchinput).classList.add('processes');
        PolymerDom(this.$.searchinput).classList.remove('components');
        this.set('$.searchinput.placeholder', 'Search processes');
      }
      this.searchChanged();
    }
    event.stopPropagation();
  },

  searchChanged() {
    this.clearResults();
    if (this.search && typeof ga === 'function') {
      ga('send', 'event', 'search', 'input', 'newSearch');
    }
    if (this.resultsCard) {
      this.set('resultsCard.children.0.search', this.search);
      this.set('resultsCard.search', this.search);
    }
    const event = this.searchLibrary ? 'search:library' : 'search:graph';
    this.fire(event, { search: this.search });
  },

  searchLibraryResultsChanged() {
    if (!this.searchLibrary) {
      return;
    }
    if (this.resultsCard && this.resultsCard.type !== 'noflo-search-library-results') {
      PolymerDom(PolymerDom(this.resultsCard).parentNode).removeChild(this.resultsCard);
      this.resultsCard = null;
    }
    if (this.resultsCard || this.search === null) {
      this.set('resultsCard.children.0.results', []);
      this.set('resultsCard.children.0.results', this.searchLibraryResults);
      return;
    }
    if (this.searchLibraryResults.length === 0) {
      if (this.resultsCard) {
        PolymerDom(PolymerDom(this.resultsCard).parentNode).removeChild(this.resultsCard);
        this.resultsCard = null;
      }
      return;
    }
    const results = document.createElement('noflo-search-library-results');
    results.id = 'results';
    results.search = this.search;
    results.results = this.searchLibraryResults;
    results.addEventListener('resultclick', () => {
      this.clearSearch();
    });
    this.resultsCard = document.createElement('the-card');
    this.set('resultsCard.type', 'noflo-search-library-results');
    PolymerDom(this.resultsCard).appendChild(results);
    this.resultsCard.addTo(this.panel, true);
  },

  searchGraphResultsChanged() {
    if (this.searchLibrary) {
      return;
    }
    if (this.resultsCard && this.resultsCard.type !== 'noflo-search-graph-results') {
      PolymerDom(PolymerDom(this.resultsCard).parentNode).removeChild(this.resultsCard);
      this.resultsCard = null;
    }
    if (this.resultsCard || this.search === null) {
      this.set('resultsCard.children.0.results', []);
      this.set('resultsCard.children.0.results', this.searchGraphResults);
      return;
    }
    if (this.searchGraphResults.length === 0) {
      if (this.resultsCard) {
        PolymerDom(PolymerDom(this.resultsCard).parentNode).removeChild(this.resultsCard);
        this.resultsCard = null;
      }
      return;
    }
    const results = document.createElement('noflo-search-graph-results');
    results.id = 'results';
    results.editor = this.editor;
    results.search = this.search;
    results.results = this.searchGraphResults;
    results.addEventListener('resultclick', () => {
      this.clearSearch();
    });
    this.resultsCard = document.createElement('the-card');
    this.set('resultsCard.type', 'noflo-search-graph-results');
    PolymerDom(this.resultsCard).appendChild(results);
    this.resultsCard.addTo(this.panel, true);
  },

  goBack(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const path = this.getParentPath(this.graphs, this.component);
    if (this.project.runtime) {
      path.unshift(this.project.runtime);
      path.unshift('runtime');
      this.fire('hash', path);
      return;
    }
    path.unshift(this.project.id);
    path.unshift('project');
    this.fire('hash', path);
  },

  showGraphInspector(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.graphs.length === 0) {
      return;
    }
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'search', 'click', 'graphProperties');
    }
    this.graphInspector = document.createElement('noflo-graph-inspector');
    this.set('graphInspector.graph', this.graph);
    this.set('graphInspector.project', this.project);
    this.set('graphInspector.runtimes', this.runtimes);
    this.set('graphInspector.theme', this.theme);
    this.graphInspector.addEventListener('delete', (ev) => {
      this.fire('deleteGraph', ev.detail);
    });
    this.graphInspector.addEventListener('specschanged', (ev) => {
      this.fire('specschanged', ev.detail);
    });
    PolymerDom(document.body).appendChild(this.graphInspector);
  },

  showComponentInspector(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'search', 'click', 'componentProperties');
    }
    this.componentInspector = document.createElement('noflo-component-inspector');
    this.set('componentInspector.component', this.component);
    this.set('componentInspector.project', this.project);
    this.componentInspector.addEventListener('delete', (ev) => {
      this.fire('deleteComponent', ev.detail);
    });
    PolymerDom(document.body).appendChild(this.componentInspector);
  },

  _canSearch(component, readonly) {
    return !readonly && (!component || !component.name);
  },

  _canGoBack(project, graphs, component) {
    if (!project) {
      return false;
    }
    if (graphs.length > 1 || (graphs.length && component)) {
      return true;
    }
    return false;
  },

  _isGraph(component, graph) {
    return graph && (!component || !component.name);
  },

  _isComponent(component) {
    return component && component.name;
  },

  _canInspectGraph(component, graph, readonly) {
    return !readonly && graph && (!component || !component.name);
  },

  _canInspectComponent(component, graph, readonly) {
    return !readonly && !graph && component && component.name;
  },

  _isReadOnly(component, graph, readonly) {
    return readonly || (component && component.readonly) || (graph && graph.properties.readonly);
  },

  getName(entity) {
    return collections.unnamespace(collections.getName(entity));
  },
});
