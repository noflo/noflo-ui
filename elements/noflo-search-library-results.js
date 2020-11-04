import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import './noflo-icon';

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
        font: normal normal normal 14px/1 FontAwesomeSVG;
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
          <i><noflo-icon icon="[[result.icon]]" fallback="cog"></noflo-icon></i>
          <h2>[[result.label]]</h2>
          <p>[[result.description]]</p>
        </li>
      </template>
    </ul>
`,

  is: 'noflo-search-library-results',

  properties: {
    results: {
      type: Array,
      value() {
        return [];
      },
      notify: true,
    },
    search: {
      type: String,
      value: '',
      notify: true,
    },
  },

  clicked(event) {
    event.preventDefault();
    const index = event.currentTarget.getAttribute('data-index');
    const result = this.results[index];
    if (!result || !result.action) {
      return;
    }
    this.fire('resultclick', result);
    result.action();
  },
});
