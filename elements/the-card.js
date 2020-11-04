import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './the-card-stack';

Polymer({
  _template: html`
    <slot name="header"></slot>
    <slot></slot>
`,

  is: 'the-card',
  properties: { type: { notify: true } },

  enteredView() {
    this.fire('show', this);
  },

  leftView() {
    this.fire('hide', this);
  },

  addTo(parent, prepend) {
    const stacks = parent.getElementsByTagName('the-card-stack');
    for (let i = 0; i < stacks.length; i += 1) {
      if (stacks[i].type === this.type) {
        PolymerDom(stacks[i]).appendChild(this);
        return;
      }
    }
    const stack = document.createElement('the-card-stack');
    stack.type = this.type;
    PolymerDom(stack).appendChild(this);
    if (prepend && parent.childElementCount > 0) {
      PolymerDom(parent).insertBefore(stack, PolymerDom(parent).firstChild);
      return;
    }
    PolymerDom(parent).appendChild(stack);
  },
});
