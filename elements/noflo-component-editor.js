import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import _ from 'underscore';
import runtimeInfo from '../runtimeinfo';
import './codemirror-styles';

Polymer({
  _template: html`
    <style include="codemirror-styles">
      :host {
        background-color: var(--noflo-ui-background);
        overflow: hidden;
      }
      .CodeMirror {
        height: 100%;
        cursor: text;
      }
      .CodeMirror-scroll {
        height: 100%;
      }
      #code,
      #tests {
        display: block;
        width: 50%;
        height: 100%;
        position: absolute;
        left: 0px;
        top: 36px;
      }
      #tests {
        left: auto;
        right: 0px;
      }
      #code h1,
      #tests h1 {
        margin: 0;
        line-height: 36px;
        padding-left: 36px;
        font-size: 14px;
        text-transform: uppercase;
        color: var(--noflo-ui-text);
      }
      #code h1 {
        text-align: right;
      }
    </style>
    <section id="code">
      <h1>Implementation</h1>
      <div id="code_editor"></div>
    </section>
    <section id="tests">
      <h1>Tests</h1>
      <div id="tests_editor"></div>
    </section>
`,

  is: 'noflo-component-editor',

  properties: {
    codeEditor: { value: null },
    component: {
      value: null,
      notify: true,
      observer: 'componentChanged',
    },
    height: {
      value: null,
      notify: true,
      observer: 'heightChanged',
    },
    project: { value: null },
    runtime: { value: null },
    spec: {
      value: null,
      observer: 'specChanged',
    },
    testsEditor: { value: null },
    theme: {
      type: String,
      value: 'dark',
      observer: 'themeChanged',
    },
    width: {
      value: null,
      notify: true,
      observer: 'widthChanged',
    },
  },

  ready() {
    this.componentChanged();
    const self = this;
    this.debouncedComponentChange = _.debounce(() => {
      if (!self.component) {
        return;
      }
      self.fire('changed', self.component);
    }, 1500);
    this.debouncedSpecChange = _.debounce(() => {
      if (!self.spec) {
        return;
      }
      self.fire('specschanged', self.spec);
    }, 1500);
  },

  componentChanged() {
    if (!this.component || !this.component.name) {
      this.set('style.display', 'none');
      return;
    }
    this.set('spec', null);
    if (this.project) {
      this.project.specs.forEach((spec) => {
        if (spec.name === this.component.name) {
          this.set('spec', spec);
        }
      });
      if (!this.spec) {
        this.set('spec', {
          name: this.component.name,
          changed: false,
          code: this.component.tests || '',
          language: 'yaml',
          project: this.component.project,
          type: 'spec',
        });
        this.push('project.specs', this.spec);
      }
    }
    this.set('style.display', 'block');
    PolymerDom(this.$.code_editor).innerHTML = '';
    if (!this.component.code) {
      this.set('component.code', this.getExampleCode());
    }
    const codeOptions = this.getMirrorOptions(this.component, this.component.code);
    this.codeEditor = CodeMirror(this.$.code_editor, codeOptions);
    this.codeEditor.on('change', () => {
      this.set('component.code', this.codeEditor.getValue());
      this.set('component.changed', true);
      this.debouncedComponentChange();
    });
    this.setSize();
  },

  specChanged() {
    PolymerDom(this.$.tests_editor).innerHTML = '';
    if (!this.spec) {
      return;
    }
    const testOptions = this.getMirrorOptions(this.spec, this.spec.code);
    this.testsEditor = CodeMirror(this.$.tests_editor, testOptions);
    this.testsEditor.on('change', () => {
      this.set('spec.code', this.testsEditor.getValue());
      this.set('spec.changed', true);
      this.debouncedSpecChange();
    });
    this.setSize();
  },

  widthChanged() {
    this.setSize();
  },

  heightChanged() {
    this.setSize();
  },

  getMirrorOptions(component, value) {
    const options = {
      lineNumbers: true,
      value: value || '',
      mode: this.getMirrorMode(component.language),
      theme: this.getMirrorTheme(),
      readOnly: component.project ? false : 'nocursor',
    };
    const canLint = () => false;
    if (canLint(component.language) && !options.readOnly) {
      options.gutters = ['CodeMirror-lint-markers'];
      options.lint = true;
    }
    return options;
  },

  getMirrorMode(language) {
    if (language === 'coffeescript' || language === 'javascript') {
      return language;
    } if (language === 'typescript') {
      return 'text/typescript';
    } if (language === 'yaml') {
      return 'text/x-yaml';
    } if (language === 'python') {
      return 'text/x-python';
    } if (language === 'c') {
      return 'text/x-csrc';
    } if (language === 'c++') {
      return 'text/x-c++src';
    } if (language === 'supercollider') {
      return 'text/x-stsrc';
    }
    // smalltalk-like
    return 'clike';
  },

  getMirrorTheme() {
    if (this.theme === 'light') {
      return 'mdn-like';
    }
    return 'noflo';
  },

  getExampleCode() {
    let runtimeType = null;
    if (this.runtime && this.runtime && this.runtime.definition && this.runtime.definition.type) {
      runtimeType = this.runtime.definition.type;
    }
    if (!runtimeType && this.project) {
      runtimeType = this.project.type;
    }
    if (!runtimeType) {
      return '';
    }
    const info = runtimeInfo[runtimeType];
    let { language } = this.component;
    if (language === 'es6') {
      language = 'es2015';
    }
    let template = '';
    if (info && info.componenttemplates && info.componenttemplates[this.component.language]) {
      template = info.componenttemplates[this.component.language];
    }
    if (template) {
      // Allow passing project/component data to template
      const templateFunc = _.template(template);
      template = templateFunc({
        namespace: this.project.namespace || this.project.id,
        name: this.component.name,
        description: this.component.description,
        icon: this.component.icon,
      });
    }
    return template;
  },

  themeChanged() {
    if (!this.codeEditor || !this.testsEditor) {
      return;
    }
    this.codeEditor.setOption('theme', this.getMirrorTheme());
    this.testsEditor.setOption('theme', this.getMirrorTheme());
  },

  setSize() {
    if (!this.width || !this.height) {
      return;
    }
    const width = (this.width - 90) / 2;
    const height = this.height - 102;
    if (this.codeEditor) {
      this.codeEditor.setSize(width, height);
      this.codeEditor.refresh();
    }
    if (this.testsEditor) {
      this.testsEditor.setSize(width, height);
      this.testsEditor.refresh();
    }
  },
});
