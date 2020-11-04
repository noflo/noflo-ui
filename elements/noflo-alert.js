import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-icon';

Polymer({
  _template: html`
    <style>
      :host {
        display: block;
        text-align: center;
        background-color: hsl(35, 98%, 46%);
        color: white;
        border-bottom: 1px black solid;
        padding: 18px;
      }
      :host(.error) {
        background-color: hsl(0, 98%, 46%);
      }
      a {
        color: hsl(0, 98%, 46%);
        background-color: white;
        display: inline-block;
        padding: 9px;
        text-decoration: none;
        font-size: 12px;
        border-radius: 3px;
      }

      /* /deep/ animations don't work: https://github.com/Polymer/polymer/issues/141#issuecomment-31887427 */
      /* only animate when on-screen */
      .fa-spin {
        -webkit-animation: none !important;
        animation: none !important;
      }
      :host(.show) .fa-spin {
        -webkit-animation: fa-spin 2s infinite linear !important;
        animation: fa-spin 2s infinite linear !important;
      }
      @-webkit-keyframes fa-spin {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(359deg);
          transform: rotate(359deg);
        }
      }
      @keyframes fa-spin {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(359deg);
          transform: rotate(359deg);
        }
      }
    </style>
    <template is="dom-if" if="{{isError}}">
      <noflo-icon icon="warning"></noflo-icon>
    </template>
    <template is="dom-if" if="{{_computeIf(isError, offerHTTPS)}}">
      <noflo-icon icon="spinner" class="fa-spin"></noflo-icon>
    </template>
    <template is="dom-if" if="{{offerHTTPS}}">
      <noflo-icon icon="lock"></noflo-icon>
      This app is available securely at <a href="https://app.flowhub.io/">https://app.flowhub.io/</a> - <a href="https://docs.flowhub.io/article/75-security-with-https-and-wss">about</a>
    </template>
    <slot>
    <span>{{message}}</span>
    <template is="dom-if" if="{{isError}}">
      <a href="#" class="button">go home</a>
    </template>
  </slot>
`,

  is: 'noflo-alert',

  properties: {
    isError: {
      type: Boolean,
      value: false,
      notify: true,
      observer: 'isErrorChanged',
    },
    message: {
      type: String,
      value: '',
      notify: true,
    },
    offerHTTPS: {
      type: Boolean,
      value: false,
      notify: true,
    },
  },

  isErrorChanged() {
    if (this.isError) {
      PolymerDom(this).classList.add('error');
    } else {
      PolymerDom(this).classList.remove('error');
    }
  },

  _computeIf(isError, offerHTTPS) {
    return !isError && !offerHTTPS;
  },
});
