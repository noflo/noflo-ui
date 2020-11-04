import { PolymerElement, html } from '@polymer/polymer';
import icons from '../src/icons';
import './noflo-icon';

class NoFloIconSelector extends PolymerElement {
  static get template() {
    return html`
    <style>
    :host {
      display: block;
    }
    ul.icons {
      padding: 0px;
      margin: 0px;
      list-style: none;
    }
    ul.icons li {
      display: inline-block;
      width: 18px;
      height: 18px;
      font-size: 18px;
      padding: 0px;
      margin: 0px;
      text-align: center;
      overflow: hidden;
      background-color: var(--noflo-ui-text);
      color: var(--noflo-ui-background);
      cursor: pointer;
      transition: background-color 0.3s ease-in-out;
      border-radius: 2px;
      margin-right: 2px
      margin-bottom: 2px;
    }
    ul.icons li.selected,
    ul.icons li:hover {
      background-color: hsl(190, 100%, 30%);
      color: white;
    }
    </style>
    <ul class="icons">
      <template is="dom-repeat" items="{{icons}}" as="icon">
        <li data-id\$="[[icon]]" class\$="[[_selectedClass(icon, selected)]]" on-click="selectIcon">
          <noflo-icon icon="[[icon]]" title="[[icon]]"></noflo-icon>
        </li>
      </template>
    </ul>
`;
  }

  static get is() {
    return 'noflo-icon-selector';
  }

  static get properties() {
    return {
      icons: {
        type: Array,
        value() {
          return [];
        },
      },
      selected: {
        type: String,
        notify: true,
      },
    };
  }

  constructor() {
    super();
    this.icons = Object.keys(icons.getIcons());
  }

  selectIcon(event) {
    this.selected = event.currentTarget.getAttribute('data-id');
  }

  _selectedClass(icon, selected) {
    if (icon === selected) {
      return 'selected';
    }
    return '';
  }
}
customElements.define(NoFloIconSelector.is, NoFloIconSelector);
