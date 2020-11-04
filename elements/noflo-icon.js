import { PolymerElement, html } from '@polymer/polymer';
import icons from '../src/icons';

class NoFloIcon extends PolymerElement {
  static get template() {
    return html`
    <style>
    :host {
      display: inline-block;
      font: normal normal normal 14px/1 FontAwesomeSVG;
      font-size: inherit;
      text-rendering: auto;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    </style>
    [[_getIcon(icon, fallback)]]
`;
  }

  static get is() {
    return 'noflo-icon';
  }

  static get properties() {
    return {
      icon: {
        type: String,
      },
      fallback: {
        type: String,
      },
    };
  }

  constructor() {
    super();
    this.icons = icons;
  }

  _getIcon(icon, fallback) {
    const result = this.icons.getIcon(icon, fallback);
    return result;
  }
}
customElements.define(NoFloIcon.is, NoFloIcon);
