import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';

Polymer({
  _template: html`
    <style>
      :host {
        position: fixed;
        overflow: hidden;
      }
    </style>
    <slot name="header"></slot>
    <slot></slot>
    <slot name="footer"></slot>
`,

  is: 'the-panel',

  properties: {
    automatic: {
      type: Boolean,
      value: false,
      notify: true,
      observer: 'automaticChanged',
    },
    edge: {
      type: String,
      value: 'left',
      notify: true,
      observer: 'edgeChanged',
    },
    handle: {
      type: Number,
      value: 0,
      notify: true,
      observer: 'handleChanged',
    },
    open: {
      type: Boolean,
      value: false,
      notify: true,
      observer: 'openChanged',
    },
    size: {
      type: Number,
      value: 200,
      notify: true,
      observer: 'sizeChanged',
    },
  },

  toggleOpen(open) {
    this.open = open;
    this.updateVisibility();
  },

  enteredView() {
    this.cleanUpLocation();
    this.automaticChanged();
    this.updateVisibility();
  },

  leftView() {
    this.unobserve();
  },

  edgeChanged() {
    this.updateVisibility();
  },

  sizeChanged() {
    this.updateVisibility();
  },

  handleChanged() {
    this.updateVisibility();
  },

  openChanged() {
    this.updateVisibility();
  },

  automaticChanged() {
    if (this.automatic) {
      this.observeChanges();
    } else {
      this.unobserve();
    }
  },

  getHeader() {
    return PolymerDom(this).querySelector('header');
  },

  getMain() {
    return PolymerDom(this).querySelector('main');
  },

  getFooter() {
    return PolymerDom(this).querySelector('footer');
  },

  handleClicked(event) {
    if (this.automatic) {
      return;
    }
    if (event.target !== this) {
      return;
    }
    if (this.open) {
      this.open = false;
      return;
    }
    this.open = true;
  },

  observeChanges() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(this.getMain(), {
      subtree: false,
      childList: true,
      attributes: false,
      characterData: false,
    });
  },

  unobserve() {
    if (!this.observer) {
      return;
    }
    this.observer.disconnect();
    this.observer = null;
  },

  handleMutations() {
    if (this.getMain().childElementCount === 0) {
      this.open = false;
    } else {
      this.open = true;
    }
  },

  getPositionDimension() {
    return this.edge;
  },

  getSizeDimensions() {
    switch (this.edge) {
      case 'left':
      case 'right':
        return [
          'width',
          'height',
        ];
      case 'top':
      case 'bottom':
        return [
          'height',
          'width',
        ];
      default:
        throw new Error(`Unknown edge ${this.edge}`);
    }
  },

  cleanUpLocation() {
    this.set('style.left', '');
    this.set('style.right', '');
    this.set('style.top', '');
    this.set('style.bottom', '');
  },

  updateVisibility() {
    const sizeDimensions = this.getSizeDimensions();
    this.set(`style.${sizeDimensions[1]}`, '100%');
    this.set(`style.${sizeDimensions[0]}`, `${this.size}px`);
    let outside = 0;
    if (!this.open) {
      outside = (this.size - this.handle) * -1;
    }
    this.set(`style.${this.getPositionDimension()}`, `${outside}px`);
  },

  listeners: { click: 'handleClicked' },
});
