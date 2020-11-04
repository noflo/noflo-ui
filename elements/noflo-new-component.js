import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import _ from 'underscore';
import runtimeInfo from '../runtimeinfo';
import './noflo-icon-selector';
import './noflo-modal-styles';

Polymer({
  _template: html`
    <style include="noflo-modal-styles">
    </style>
    <div class="modal-container" on-click="bgClick">
      <h1>Create new component</h1>
      <form>
        <div class="modal-content">
        <label>
          Component name
          <input type="text" value="{{name::input}}" placeholder="MyCoolComponent" required="">
        </label>
        <label>
          Component description
          <input type="text" value="{{description::input}}" placeholder="Do something interesting">
        </label>
        <label>
          Language
          <select name="type" value="{{language::input}}">
            <template is="dom-repeat" items="{{languages}}" as="lang">
            <option value="[[lang.id]]" selected\$="[[_languageSelected(lang, language)]]">[[lang.label]]</option>
            </template>
          </select>
        </label>
        <label>
          Icon
          <noflo-icon-selector selected="{{icon}}"></noflo-icon-selector>
        </label>
        </div>
        <div class="toolbar">
          <button on-click="send" class\$="{{_computeClass(canSend)}}">Create</button>
          <a on-click="close">Cancel</a>
        </div>
      </form>
    </div>
`,

  is: 'noflo-new-component',

  properties: {
    canSend: {
      type: Boolean,
      value: false,
    },
    language: {
      type: String,
      value: '',
    },
    type: {
      type: String,
      value: '',
      notify: true,
      observer: 'typeChanged',
    },
    languages: {
      type: Array,
      value() {
        return [
          {
            id: 'c',
            label: 'C',
          },
          {
            id: 'c++',
            label: 'C++',
          },
          {
            id: 'coffeescript',
            label: 'CoffeeScript',
          },
          {
            id: 'es2015',
            label: 'JavaScript (modern ES2015)',
          },
          {
            id: 'javascript',
            label: 'JavaScript',
          },
          {
            id: 'typescript',
            label: 'TypeScript',
          },
          {
            id: 'python',
            label: 'Python',
          },
          {
            id: 'supercollider',
            label: 'SuperCollider',
          },
          {
            id: 'yaml',
            label: 'YAML',
          },
        ];
      },
    },
    name: {
      type: String,
      value: '',
      observer: 'nameChanged',
    },
    description: {
      type: String,
      value: '',
    },
    icon: {
      type: String,
      value: 'cog',
      notify: true,
    },
    project: {
      type: Object,
      value() {
        return {};
      },
      notify: true,
    },
  },

  attached() {
    PolymerDom(document.getElementById('container')).classList.add('blur');
    PolymerDom(this).classList.add('modal-content');
  },

  detached() {
    PolymerDom(document.getElementById('container')).classList.remove('blur');
  },

  typeChanged() {
    if (!this.type) {
      // No type defined, keep full list
      return;
    }
    const runtimeI = runtimeInfo[this.type];
    if (!runtimeI || !runtimeI.componenttemplates) {
      // We don't know what languages the runtime supports, so keep full list
      return;
    }

    // Filter list of languages to the ones supported by the runtime
    const allLanguages = this.languages;
    this.languages = allLanguages.filter((lang) => {
      if (!runtimeI.componenttemplates[lang.id]) {
        return false;
      }
      return true;
    });
    if (!this.languages.length) {
      // Default back to all
      this.languages = allLanguages;
    }
    // Default to first language if runtime has no preference
    this.language = runtimeI.preferredlanguage || this.languages[0].id;
  },

  nameChanged() {
    let duplicates = [];
    if (this.name) {
      // Same regexp as used by the FBP language parser
      this.name = this.name.replace(/[^a-zA-Z0-9]+/g, '_');
    }
    if (this.project) {
      duplicates = this.project.components.filter((component) => {
        if (component.name === this.name) {
          return true;
        }
        return false;
      });
      duplicates = duplicates.concat(this.project.graphs.filter((graph) => {
        if (graph.name === this.name) {
          return true;
        }
        return false;
      }));
    }
    if (this.name && this.project && !duplicates.length) {
      this.canSend = true;
    } else {
      this.canSend = false;
    }
  },

  send(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.name) {
      return;
    }
    if (typeof ga === 'function') {
      ga('send', 'event', 'button', 'click', 'newComponent');
    }
    this.fire('new', {
      id: `${this.project.id}/${this.name}`,
      name: this.name,
      description: this.description,
      language: this.language,
      icon: this.icon,
      project: this.project.id,
      code: this.getExampleCode(this.language),
      tests: '',
    });
    this.fire('newSpec', {
      id: `${this.project.id}/${this.name}`,
      name: this.name,
      code: this.getExampleSpec(),
      language: 'yaml',
      project: this.project.id,
      type: 'spec',
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

  _computeClass(canSend) {
    return this.tokenList({ disabled: !canSend });
  },

  _languageSelected(lang, selected) {
    if (lang.id === selected) {
      return true;
    }
    return false;
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

  getExampleCode(language) {
    if (!this.type) {
      return '';
    }
    const info = runtimeInfo[this.type];
    let lang = language;
    if (lang === 'es6') {
      lang = 'es2015';
    }
    let template = '';
    if (info && info.componenttemplates && info.componenttemplates[lang]) {
      template = info.componenttemplates[lang];
    }
    if (template) {
      // Allow passing project/component data to template
      const templateFunc = _.template(template);
      template = templateFunc({
        namespace: this.project.namespace || this.project.id,
        name: this.name,
        description: this.description,
        icon: this.icon,
      });
    }
    return template;
  },

  getExampleSpec() {
    let fbpSpec = '';
    fbpSpec += `name: ${this.name} component\n`;
    fbpSpec += `topic: ${this.project.namespace || this.project.id}/${this.name}\n`;
    fbpSpec += 'cases:\n';
    fbpSpec += '  -\n';
    fbpSpec += '    name: with an input packet\n';
    fbpSpec += '    assertion: should send the same packet out\n';
    fbpSpec += '    inputs:\n';
    fbpSpec += '      in: true\n';
    fbpSpec += '    expect:\n';
    fbpSpec += '      out:\n';
    fbpSpec += '        equals: true\n';
    return fbpSpec;
  },
});
