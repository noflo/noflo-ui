import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
      #cta {
        display: inline;
        width: auto;
        background-color: transparent;
        color: hsl(190, 100%, 30%);
        border: 1px solid hsl(190, 100%, 30%);
        font-size: 13px;
        height: 36px;
        padding-left: 36px;
        padding-right: 36px;
        cursor: pointer;
      }
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Account settings for <span>{{user.flowhub-user.name}}</span></h1>
      <form>
        <label>
          Theme
          <select name="type" value="{{theme::input}}">
            <option value="dark" selected\$="[[_isSelectedTheme('dark', theme)]]">Lazer</option>
            <option value="light" selected\$="[[_isSelectedTheme('light', theme)]]">Tube</option>
          </select>
        </label>
        <label>
          Debug [[env.NOFLO_APP_TITLE]] in Flowhub (requires reload)
          <select name="type" value="{{debug::input}}">
            <option value="false" selected\$="[[_isSelectedDebug('false', debug)]]">Disabled</option>
            <option value="true" selected\$="[[_isSelectedDebug('true', debug)]]">Enabled</option>
          </select>
        </label>
        <div class="toolbar">
          <button on-click="send">Save</button>
          <a on-click="close">Cancel</a>
        </div>
      </form>
    </div>
`,

  is: 'noflo-account-settings',

  properties: {
    theme: {
      type: String,
    },
    debug: {
      type: String,
      value: 'false',
    },
    user: {
      type: Object,
      value() {
        return {};
      },
      notify: true,
      observer: 'userChanged',
    },
    env: {
      type: Object,
      value() {
        return {
          NOFLO_APP_TITLE: process.env.NOFLO_APP_TITLE,
        };
      },
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  send(event) {
    event.preventDefault();
    event.stopPropagation();
    this.fire('updated', {
      'flowhub-theme': this.theme,
      'flowhub-debug': this.debug,
    });
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

  userChanged() {
    this.theme = this.user['flowhub-theme'] || 'dark';
    this.debug = this.user['flowhub-debug'] || 'false';
  },

  _isSelectedTheme(theme, current) {
    return theme === current;
  },

  _isSelectedDebug(value, current) {
    return value === current;
  },
});
