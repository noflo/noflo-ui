/*

* Wraps the-graph-thumb with a current view bounding box
* Observes changes from attached instance of the-graph-editor

*/
import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import './the-graph-thumb';

Polymer({
  _template: html`
    <style>
      #thumb, 
      #outcanvas {
        position: absolute;
        top: 0;
        left: 0;
        overflow: visible;
      }
      #viewrect {
        position: absolute;
        top: 0;
        left: 0;
        width: 200px;
        height: 150px;
        border: 1px solid hsla(190, 100%, 80%, 0.4);
        border-style: dotted;
      }
    </style>
    <the-graph-thumb id="thumb" graph="{{graph}}" thumbrectangle="{{thumbrectangle}}" width="{{width}}" height="{{height}}" thumbscale="{{thumbscale}}" theme="{{theme}}">
    </the-graph-thumb>
    <canvas id="outcanvas" width="{{width}}" height="{{height}}" style="position:absolute;top:0;left:0;"></canvas>
    <div id="viewrect"></div>
`,

  is: 'the-graph-nav',

  properties: {
    backgroundColor: {
      type: String,
      value: 'hsla(184, 8%, 75%, 0.9)',
    },
    graph: { notify: true },
    height: {
      type: Number,
      value: 150,
      notify: true,
    },
    hide: {
      type: Boolean,
      value: false,
      notify: true,
      observer: 'hideChanged',
    },
    outsideFill: {
      type: String,
      value: 'hsla(0, 0%, 0%, 0.4)',
    },
    theme: {
      notify: true,
      observer: 'themeChanged',
    },
    thumbrectangle: { observer: 'thumbrectangleChanged' },
    thumbscale: {
      type: Number,
      value: 1,
      observer: 'thumbscaleChanged',
    },
    view: { observer: 'viewChanged' },
    viewrectangle: { observer: 'viewrectangleChanged' },
    width: {
      type: Number,
      value: 200,
      notify: true,
    },
  },

  ready() {
    this.viewrectangle = [
      0,
      0,
      500,
      500,
    ];
    this.scaledviewrectangle = [
      0,
      0,
      200,
      150,
    ];
    this.theme = 'dark';
  },

  attached() {
    this.set('style.overflow', 'hidden');
    this.set('style.cursor', 'move');
    this.set('style.width', `${this.width}px`);
    this.set('style.height', `${this.height}px`);
  },

  viewChanged(_, view) {
    if (!view) {
      return;
    }
    const x = view.pan[0];
    const y = view.pan[1];
    this.viewrectangle = [-x, -y, view.width, view.height];
    this.scale = view.scale;
  },

  themeChanged() {
    const style = TheGraph.nav.calculateStyleFromTheme(this.theme);
    this.backgroundColor = style.backgroundColor;
    this.viewBoxBorder = style.viewBoxBorder;
    this.viewBoxBorder2 = style.viewBoxBorder2;
    this.outsideFill = style.outsideFill;
    this.set('style.backgroundColor', this.backgroundColor);
    // Redraw rectangle
    this.viewrectangleChanged();
  },

  viewrectangleChanged() {
    if (!this.viewrectangle || !this.viewrectangle.length) {
      return;
    }
    // Canvas to grey out outside view
    const context = this.$.outcanvas.getContext('2d');
    const properties = {
      width: this.width,
      height: this.height,
      scale: this.scale,
      thumbscale: this.thumbscale,
      thumbrectangle: this.thumbrectangle,
      viewrectangle: this.viewrectangle,
      viewBoxBorder: this.viewBoxBorder,
      viewBoxBorder2: this.viewBoxBorder2,
      outsideFill: this.outsideFill,
    };
    const nav = TheGraph.nav.render(context, this.$.viewrect, properties);
    this.hide = nav.hide;
  },

  // this.scaledviewrectangle = [x, y, w, h];
  hideChanged() {
    if (this.hide) {
      this.set('style.display', 'none');
    } else {
      this.set('style.display', 'block');
    }
  },

  thumbscaleChanged() {
    this.viewrectangleChanged();
  },

  thumbrectangleChanged() {
    // Binding this from the-graph-thumb to know the dimensions rendered
    const w = this.thumbrectangle[2];
    const h = this.thumbrectangle[3];
    this.thumbscale = w > h ? this.width / w : this.height / h;
  },

  hostAttributes: { 'touch-action': 'none' },
});
