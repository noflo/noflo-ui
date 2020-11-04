import { Polymer, html } from '@polymer/polymer/polymer-legacy';

Polymer({
  _template: html`
    <style>
      .search-results-header h1 {
        color: var(--noflo-ui-border);
        padding-left: 25px;
        font-size: 12px !important;
      }
      .search-results-header i {
        padding: 0;
        margin: 0;
        line-height: 36px;
        width: 36px;
        left: -10px;
        position: absolute;
        text-align: center;
      }

      .search-results-list {
        -webkit-box-sizing: border-box;
        -mox-box-sizing: border-box;
        box-sizing: border-box;
        list-style: none;
        margin: 0;
        padding: 0;
        background-color: var(--noflo-ui-background);
        border-right: 1px solid var(--noflo-ui-border);
      }

      .search-results-item {
        -webkit-box-sizing: border-box;
        -mox-box-sizing: border-box;
        box-sizing: border-box;
        min-height: 36px;
        position: relative;
        cursor: cell;
        padding-top: 18px !important;
        padding-right: 12px !important;
      }
      .search-results-item i {
        color: var(--noflo-ui-text-highlight);
        position: absolute;
        top: 18px;
        left: 0;
        width: 36px;
        text-align: center;
        padding: 0;
        margin: 0;
      }
      .search-results-item h2 {
        color: var(--noflo-ui-text-highlight);
        position: absolute;
        margin: 0;
        display: block;
        left: 36px;
        top: 18px;
        height: 36px;
        width: calc(100% - 36px);
        font-size: 12px;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
        overflow-x: hidden;
      }
      .search-results-item p {
        position: relative;
        display: block;
        left: 8px;
        padding: 0px;
        margin: 0px;
        margin-top: 24px;
        height: auto;
        line-height: calc(36px / 3);
        font-size: 10px;
        color: var(--noflo-ui-text);
        text-shadow: var(--noflo-ui-background) 0px 1px 1px;
      }
    </style>
    <ul class="search-results-list">
      <template is="dom-repeat" items="{{results}}" as="result" index-as="index">
        <li class="search-results-item" on-click="clicked" data-index\$="{{index}}">
          <i class="fa fa-cog"></i>
          <h2>{{result.metadata.label}}</h2>
          <p>{{result.component}}</p>
        </li>
      </template>
    </ul>
`,

  is: 'noflo-search-graph-results',

  properties: {
    editor: {
      value: null,
      notify: true,
    },
    results: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
      observer: 'resultsChanged',
    },
    search: {
      type: String,
      value: '',
      notify: true,
    },
  },

  detached() {
    this.editor = null;
  },

  resultsChanged() {
    if (!this.editor) return;
    if (!this.search || this.search.length < 1) {
      this.set('editor.displaySelectionGroup', true);
      this.set('editor.selectedNodes', []);
    } else if (this.results) {
      this.set('editor.displaySelectionGroup', !(this.results.length > 0));
      this.set('editor.selectedNodes', this.results);
    }
  },

  clicked(event) {
    event.preventDefault();
    const index = event.currentTarget.getAttribute('data-index');
    const result = this.results[index];
    if (!result) {
      return;
    }
    this.set('editor.displaySelectionGroup', true);
    this.set('editor.selectedNodes', [result]);
    this.editor.focusNode(result);
    this.fire('resultclick', result);
  },
});
