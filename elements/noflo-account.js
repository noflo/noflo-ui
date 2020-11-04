import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './noflo-account-settings';

Polymer({
  _template: html`
    <style>
      :host {
        background-color: var(--noflo-ui-background) !important;
        color: var(--noflo-ui-text);
        display: block;
        padding-top: 18px;
        width: 100%;
      }
      nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding-left: 72px;
        padding-right: 72px;
        padding-bottom: 18px;
      }
      section.app {
        display: flex;
        flex-direction: row;
      }
      section.app .logo {
        margin-right: 18px;
        width: 72px;
        height: 72px;
      }
      section.app .logo img {
        width: 72px;
        height: 72px;
        display: inline-block;
      }
      section.app h1 {
        font-size: 18px;
        line-height: 36px;
        margin: 0;
        padding: 0;
      }
      section.app h2 {
        font-size: 9px;
        line-height: 36px;
        margin: 0;
        padding: 0;
      }
      section.user {
        text-align: right;
      }
      section.user .avatar {
        display: inline;
        line-height: 18px;
      }
      section.user .avatar img {
        width: 18px;
        height: 18px;
        display: inline-block;
      }
      section.user h1,
      section.user form {
        display: inline;
        line-height: 36px;
      }
      section.user #plan {
        display: inline-block;
        font-size: 8px;
        text-transform: uppercase;
        vertical-align: super;
        color: black;
        background-color: hsl(185, 98%, 46%);
        border: none;
        line-height: 10px;
        text-decoration: none;
        padding: 2px;
        border-radius: 2px;
        cursor: pointer;
      }
      section.user .free #plan,
      section.user .backer #plan {
        background-color: hsl(135, 98%, 46%);
      }
      section.user .pro #plan {
        background-color: hsl(160, 98%, 46%);
      }
      section.user .supporter #plan {
        background-color: hsl(185, 98%, 46%);
      }
      section.user .toolbar {
        line-height: 36px;
        font-size: 9px;
      }
      section.user .toolbar a,
      section.user .toolbar button {
        padding: 3px;
        text-shadow: none;
        text-decoration: none;
        box-shadow: none;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        font-size: 9px;
        margin-left: 9px;
        cursor: pointer;
        border: none;
        background-color: transparent;
        color: var(--noflo-ui-text);
      }
      section.user .toolbar a.login::before {
        content: ' ';
        position: absolute;
        border: 2px solid hsla(190, 98%, 46%, .8);
        border-radius: 6px;
        top: -6px;
        bottom: -6px;
        left: -6px;
        right: -6px;
        transition: all 0.3s ease;
      }
      section.user .toolbar a.login {
        position: relative;
        padding: 9px;
        font-size: 18px;
        border: 1px solid hsl(190, 98%, 46%);
        background: hsla(190, 98%, 46%, .8);
        line-height: 18px;
        border-radius: 3px;
        color: var(--noflo-ui-text);
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        box-sizing: border-box;
        transition: background-color 0.2s ease-in;
      }
      section.user .toolbar a.login:hover,
      section.user .toolbar a.login:focus,
      section.user .toolbar a.login:active {
        background-color: var(--noflo-ui-background) !important;
        color: var(--noflo-ui-text) !important;
        outline: 0;
      }
      div.banner {
        background-color: hsla(190, 98%, 46%, .8);
        padding: 18px;
        padding-left: 72px;
        padding-right: 72px;
      }
      div.banner a {
        color: var(--noflo-ui-text);
        cursor: pointer;
      }
      div.banner div {
        margin-top: 18px;
      }
      div.banner button,
      div.banner a.cta,
      div.banner input[type="submit"] {
        display: inline-block;
        color: var(--noflo-ui-background);
        background-color: var(--noflo-ui-text);
        border: none;
        font-size: 13px;
        border-radius: 3px;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        height: 36px;
        padding-left: 36px;
        padding-right: 36px;
        padding-top: 1px;
        padding-bottom: 1px;
        line-height: 36px;
        margin: 0px;
        cursor: pointer;
        font-size: 13px;
        text-decoration: none;
      }
      </style>
    <nav>
    <section class="app">
      <div class="logo \$NOFLO_THEME"><img src="../app/\$NOFLO_THEME-72.png"></div>
      <div class="name">
        <h1>
          \$NOFLO_APP_NAME
        </h1>
        <h2>
          v\$NOFLO_APP_VERSION
        </h2>
      </div>
    </section>
    <section class="user">
    <template is="dom-if" if="{{user.flowhub-user}}">
      <div class\$="{{user.flowhub-plan}}">
        <template is="dom-if" if="{{user.flowhub-avatar}}">
          <div class="avatar"><img src="{{user.flowhub-avatar}}"></div>
        </template>
        <h1>
          <span>{{user.github-username}}</span>
          <form method="post" action="https://plans.flowhub.io/auth/flowhub">
            <input type="hidden" name="username" value="{{user.github-username::input}}">
            <input type="hidden" name="password" value="{{user.flowhub-token::input}}">
            <input type="submit" id="plan" value="{{user.flowhub-plan::input}}">
          </form>
        </h1>
        <div class="toolbar">
          <a href="https://docs.flowhub.io" target="_blank">Docs</a>
          <a on-click="openSettings">Settings</a>
          <button on-click="logout">Logout</button>
        </div>
      </div>
    </template>
    <template is="dom-if" if="{{!user.flowhub-user}}">
      <div class="toolbar">
        <a id="loginbutton" class="login" on-click="login">Login</a>
      </div>
    </template>
    </section>
    </nav>
    <template is="dom-if" if="{{user.flowhub-user}}">
      <template is="dom-if" if="{{askForScope.length}}">
        <div class="banner">
          To be able to synchronize your GitHub projects, \$NOFLO_APP_TITLE needs repository access permissions. <a href="https://docs.flowhub.io/github-integration/" target="_blank">Read more</a>
          <div>
            Grant access to:
            <template is="dom-repeat" items="{{askForScope}}" as="scope">
              <template is="dom-if" if="{{_ifPublicScope(scope)}}">
                <button on-click="relogin" data-scope\$="{{scope}}">Public repositories only</button>
              </template>
              <template is="dom-if" if="{{_ifPrivateScope(scope)}}">
                <button on-click="relogin" data-scope\$="{{scope}}">Public and private repositories</button>
              </template>
            </template>
          </div>
        </div>
      </template>
      <template is="dom-if" if="{{_ifFreePlan(askForScope, user.flowhub-plan)}}">
        <div class="banner">
          You're using a free Flowhub plan. By subscribing to Flowhub you directly support NoFlo development, and help us all get to the future of programming faster.
          <div>
            <form method="post" action="https://plans.flowhub.io/auth/flowhub">
              <input type="hidden" name="username" value="{{user.github-username::input}}">
              <input type="hidden" name="password" value="{{user.flowhub-token::input}}">
              <input type="submit" id="cta" value="Subscribe now">
            </form>
          </div>
        </div>
      </template>
    </template>
    <template is="dom-if" if="{{!user.flowhub-user}}">
      <div class="banner">
        Logging into \$NOFLO_APP_TITLE enables you to synchronize projects with Github. By subscribing to Flowhub you directly support NoFlo development, and help us all get to the future of programming faster.
        <div>
          <a class="cta" href="https://plans.flowhub.io">Subscribe now</a>
        </div>
      </div>
    </template>
`,

  is: 'noflo-account',

  properties: {
    theme: {
      type: String,
    },
    askForScope: {
      type: Array,
      value() {
        return [];
      },
    },
    help: { value: null },
    user: {
      type: Object,
      value() {
        return {};
      },
      notify: true,
      observer: 'userChanged',
    },
  },

  login() {
    this.fire('login', true);
  },

  logout() {
    this.fire('logout', true);
  },

  relogin(event) {
    event.preventDefault();
    const scope = event.currentTarget.getAttribute('data-scope');
    this.fire('relogin', scope);
  },

  userChanged() {
    if (!this.user || !this.user['flowhub-user']) {
      return;
    }
    if (!this.user['flowhub-user'].github) {
      return;
    }
    if (!this.user['flowhub-user'].plan || this.user['flowhub-user'].plan.type === 'free') {
      if (!this.user['flowhub-user'].github.scopes || this.user['flowhub-user'].github.scopes.indexOf('public_repo') === -1) {
        // User is on free plan but hasn't granted repo access
        this.set('askForScope', ['public_repo']);
      }
      return;
    }
    if (!this.user['flowhub-user'].github.scopes || this.user['flowhub-user'].github.scopes.indexOf('repo') === -1) {
      // User is on paid plan but hasn't granted repo access
      this.set('askForScope', ['repo']);
      if (!this.user['flowhub-user'].github.scopes || this.user['flowhub-user'].github.scopes.indexOf('public_repo') === -1) {
        // Allow paid users to limit repo access to only public if they want
        this.push('askForScope', 'public_repo');
      }
    }
  },

  openSettings() {
    if (PolymerDom(document).querySelectorAll('.modal-content:not(polymer-element)').length) {
      return;
    }
    if (!this.user['flowhub-user']) {
      return;
    }
    const dialog = document.createElement('noflo-account-settings');
    dialog.user = this.user;
    dialog.theme = this.theme;
    PolymerDom(document.body).appendChild(dialog);
    dialog.addEventListener('updated', (event) => {
      this.fire('userUpdated', event.detail);
    });
  },

  _ifFreePlan(askForScope, plan) {
    return plan === 'free' && !askForScope.length;
  },

  _ifPublicScope(scope) {
    return scope === 'public_repo';
  },

  _ifPrivateScope(scope) {
    return scope === 'repo';
  },
});
