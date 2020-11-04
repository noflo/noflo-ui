import { Polymer } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';

Polymer({
  is: 'the-card-stack',
  properties: { type: { notify: true } },
  enteredView() {
    this.observeChanges();
  },
  leftView() {
    if (this.observer) {
      this.observer.disconnect();
    }
  },
  observeChanges() {
    this.observer = new MutationObserver(this.updateVisibility.bind(this));
    this.observer.observe(this, {
      subtree: false,
      childList: true,
      attributes: false,
      characterData: false,
    });
  },
  updateVisibility() {
    if (this.childElementCount === 0) {
      PolymerDom(PolymerDom(this).parentNode).removeChild(this);
    }
  },
});
