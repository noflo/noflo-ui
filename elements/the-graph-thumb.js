/*
* Renders a fbp-graph instance into a canvas
* Autoscales the render to fit, and exposes the scale as thumbscale, thumbrectangle, viewrectangle
*/
import { Polymer, html } from '@polymer/polymer/polymer-legacy';

Polymer({
  _template: html`
    <canvas id="canvas" width="{{width}}" height="{{height}}" style="position:absolute;top:0;left:0;"></canvas>
`,

  is: 'the-graph-thumb',

  properties: {
    edgeColors: {
      type: Array,
      value() {
        return [
          'white',
          'hsl(  0, 100%, 46%)',
          'hsl( 35, 100%, 46%)',
          'hsl( 60, 100%, 46%)',
          'hsl(135, 100%, 46%)',
          'hsl(160, 100%, 46%)',
          'hsl(185, 100%, 46%)',
          'hsl(210, 100%, 46%)',
          'hsl(285, 100%, 46%)',
          'hsl(310, 100%, 46%)',
          'hsl(335, 100%, 46%)',
        ];
      },
    },
    fillStyle: {
      type: String,
      value: 'hsl(184, 8%, 10%)',
    },
    graph: {
      value: null,
      notify: true,
      observer: 'graphChanged',
    },
    height: {
      type: Number,
      value: 150,
      notify: true,
      observer: 'heightChanged',
    },
    lineWidth: {
      type: Number,
      value: 0.75,
    },
    listener: { value: null },
    nodeSize: {
      type: Number,
      value: 60,
    },
    strokeStyle: {
      type: String,
      value: 'hsl(180, 11%, 70%)',
    },
    theme: {
      type: String,
      value: 'dark',
      notify: true,
      observer: 'themeChanged',
    },
    thumbrectangle: { notify: true },
    thumbscale: {
      type: Number,
      value: 1,
      notify: true,
    },
    width: {
      type: Number,
      value: 200,
      notify: true,
      observer: 'widthChanged',
    },
  },

  ready() {
    this.thumbrectangle = [
      0,
      0,
      500,
      500,
    ];
    this.viewrectangle = [
      0,
      0,
      200,
      150,
    ];
  },

  attached() {
    this.set('style.width', `${this.width}px`);
    this.set('style.height', `${this.height}px`);
    this.themeChanged();
  },

  themeChanged() {
    const style = TheGraph.thumb.styleFromTheme(this.theme);
    this.edgeColors = style.edgeColors;
    this.fillStyle = style.fill;
    this.strokeStyle = style.stroke;
    // Redraw
    this.redrawGraph();
  },

  redrawGraph() {
    if (!this.graph) {
      return;
    }
    const context = this.$.canvas.getContext('2d');
    if (!context) {
      // ???
      setTimeout(this.redrawGraph.bind(this), 500);
      return;
    }
    const properties = {
      width: this.width,
      height: this.height,
      edgeColors: this.edgeColors,
      nodeSize: this.nodeSize,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
    const thumb = TheGraph.thumb.render(context, this.graph, properties);
    this.thumbrectangle = thumb.rectangle;
    this.thumbscale = thumb.scale;
  },

  graphChanged(newGraph, oldGraph) {
    if (!this.listener) {
      this.listener = this.redrawGraph.bind(this);
    }
    if (oldGraph) {
      oldGraph.removeListener('endTransaction', this.listener);
    }
    if (!this.graph) {
      return;
    }
    this.graph.on('endTransaction', this.listener);
    this.redrawGraph();
  },

  widthChanged() {
    this.set('style.width', `${this.width}px`);
    this.redrawGraph();
  },

  heightChanged() {
    this.set('style.height', `${this.height}px`);
    this.redrawGraph();
  },

  toDataURL() {
    return this.$.canvas.toDataURL();
  },
});
