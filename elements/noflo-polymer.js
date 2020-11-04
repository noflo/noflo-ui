import { PolymerElement } from '@polymer/polymer';

class NofloPolymer extends PolymerElement {
  static get properties() {
    return {
      element: {
        type: String,
      },
      inports: {
        type: String,
      },
      outports: {
        type: String,
      },
    };
  }
}

customElements.define('noflo-polymer', NofloPolymer);
