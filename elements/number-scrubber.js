import { Polymer, html } from '@polymer/polymer/polymer-legacy';

Polymer({
  _template: html`
    <style>
      :host {
        -webkit-user-select: none;      /* disable cut copy paste */
        -webkit-touch-callout: none;    /* disable callout, image save panel */
        user-select: none;
        touch-callout: none;

        cursor: ew-resize;

        display: inline-block;
        text-align: center;      
      }
    </style>
`,

  is: 'number-scrubber',

  properties: {
    distance: {
      type: Number,
      value: 5,
      notify: true,
    },
    max: {
      value() {
        return Infinity;
      },
      notify: true,
    },
    min: {
      value() {
        return -Infinity;
      },
      notify: true,
    },
    mod: {
      type: Number,
      value: 0,
      notify: true,
    },
    precision: {
      type: Number,
      value: 1000000,
    },
    scrubend: { value: null },
    scrubstart: { value: null },
    startValue: {
      type: Number,
      value: 0,
    },
    step: {
      type: Number,
      value: 1,
      notify: true,
    },
    value: {
      value() {
        return undefined;
      },
      notify: true,
    },
  },

  onTrackStart() {
    // Don't select
    document.body.style.webkitUserSelect = 'none';
    document.body.style.MozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    this.fire('scrubstart');
    if (this.value === undefined) {
      return;
    }
    this.value = parseFloat(this.value);
    this.startValue = this.value;
  },

  onTrack(event) {
    if (this.value === undefined) {
      return;
    }
    let delta = event.dx;
    if (this.distance > 1) {
      delta = Math.round(delta / this.distance);
    }
    if (this.step !== 1) {
      if (this.step > 1) {
        delta = Math.round(delta / this.step) * this.step;
      } else if (this.step > 0) {
        delta *= this.step;
      }
    }
    let newValue = this.startValue + delta;
    if (this.mod !== 0) {
      newValue %= this.mod;
    }
    if (Number.isFinite(this.min)) {
      newValue = Math.max(newValue, this.min);
    }
    if (Number.isFinite(this.max)) {
      newValue = Math.min(newValue, this.max);
    }
    // Stupid JS numbers
    if (this.precision > 1) {
      newValue = Math.round(newValue * this.precision) / this.precision;
    }
    if (this.value !== newValue) {
      this.value = newValue;
      this.fire('scrub', this.value);
    }
  },

  onTrackEnd() {
    // Reset select
    document.body.style.webkitUserSelect = 'auto';
    document.body.style.MozUserSelect = 'auto';
    document.body.style.msUserSelect = 'auto';
    document.body.style.userSelect = 'auto';
    document.body.style.cursor = 'auto';
    this.fire('scrubend');
  },

  hostAttributes: { 'touch-action': 'none' },

  listeners: {
    trackstart: 'onTrackStart',
    track: 'onTrack',
    trackend: 'onTrackEnd',
  },
});
