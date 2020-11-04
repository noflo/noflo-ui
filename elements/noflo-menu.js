import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import './noflo-icon';

Polymer({
  _template: html`
    <ul class="toolbar2right">
      <template is="dom-repeat" items="{{buttons}}" as="button">
        <li>
          <button on-click="clicked" id="{{button.id}}">
            <noflo-icon icon="{{button.icon}}" fallback=""></noflo-icon>
            <span>{{button.label}}</span>
          </button>
        </li>
      </template>
    </ul>
`,

  is: 'noflo-menu',

  properties: {
    buttons: {
      type: Array,
      value() {
        return [];
      },
    },
  },

  clicked(event, detail, sender) {
    event.preventDefault();
    this.buttons.forEach((button) => {
      if (button.id !== sender.getAttribute('id')) {
        return;
      }
      this.fire('click', button.id);
      if (button.search) {
        this.fire('search', button.search);
        return;
      }
      button.action();
    });
  },
});
