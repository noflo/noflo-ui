/**
 * FlowHeatmap Web Component
 *
 * Renders a low-resolution activity "heat" overlay aligned to the editor's
 * `16000×16000` graph coordinate space. Activity is reported via
 * `recordActivity(worldX, worldY)`; recorded grid cells decay over time.
 *
 * The component is fully self-contained: it owns its `<canvas>`, the decay
 * interval, and its own positioning (`top/left: -8000px`, `16000×16000px`)
 * so it lines up with the graph origin used by the edge/IIP SVG groups.
 *
 * @extends HTMLElement
 */
export class FlowHeatmap extends HTMLElement {
  /** @type {number} */
  static GRID_SIZE = 40;
  /** @type {number} Side length (in px) of the drawing buffer. */
  static CANVAS_SIZE = 800;
  /** @type {number} Half-extent of the graph coordinate space the canvas covers. */
  static SPACE_OFFSET = 8000;
  /** @type {number} Amount each cell's heat is reduced per tick. */
  static DECAY = 0.1;
  /** @type {number} Amount added to a cell's heat per activity report. */
  static INCREMENT = 0.25;
  /** @type {number} Max heat a cell can reach. */
  static MAX_HEAT = 1.0;
  /** @type {number} Heat below which a cell is dropped. */
  static MIN_HEAT = 0.05;
  /** @type {number} Decay loop interval in milliseconds. */
  static TICK_MS = 500;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {Map<string, number>} key `"col,row"` -> heat 0..1 */
    this.activityMap = new Map();
    /** @type {HTMLCanvasElement | null} */
    this.canvas = null;
    /** @type {number | null} */
    this.intervalId = null;
  }

  connectedCallback() {
    this.render();
    this.startLoop();
  }

  disconnectedCallback() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  render() {
    const { SPACE_OFFSET, CANVAS_SIZE } = FlowHeatmap;
    /** @type {ShadowRoot} */ (this.shadowRoot).innerHTML = `
      <style>
        :host {
          position: absolute;
          top: -${SPACE_OFFSET}px;
          left: -${SPACE_OFFSET}px;
          width: ${SPACE_OFFSET * 2}px;
          height: ${SPACE_OFFSET * 2}px;
          pointer-events: none;
          z-index: 0;
        }
        canvas {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
      </style>
      <canvas width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
    `;
    this.canvas = /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
      "canvas",
    );
  }

  startLoop() {
    this.intervalId = setInterval(
      () => this._renderFrame(),
      FlowHeatmap.TICK_MS,
    );
  }

  /** @private */
  _renderFrame() {
    const canvas = this.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const heatmapColor = getComputedStyle(this)
      .getPropertyValue("--heatmap-color")
      .trim();
    if (!heatmapColor) return;

    const {
      GRID_SIZE,
      SPACE_OFFSET,
      CANVAS_SIZE,
      DECAY,
      MIN_HEAT,
    } = FlowHeatmap;
    // Drawing buffer is CANVAS_SIZE px for a (SPACE_OFFSET*2) px space.
    const scale = (SPACE_OFFSET * 2) / CANVAS_SIZE;
    const cellPx = 2;

    for (const [key, heat] of this.activityMap.entries()) {
      if (heat <= MIN_HEAT) {
        this.activityMap.delete(key);
        continue;
      }

      const [col, row] = key.split(",").map(Number);

      const color = heatmapColor.startsWith("rgba")
        ? heatmapColor.replace(/[\d.]+\)$/, `${heat * 0.6})`)
        : heatmapColor.replace(/\)$/, `, ${heat * 0.6})`);

      ctx.fillStyle = color;
      ctx.fillRect(
        (col * GRID_SIZE + SPACE_OFFSET) / scale,
        (row * GRID_SIZE + SPACE_OFFSET) / scale,
        cellPx,
        cellPx,
      );

      this.activityMap.set(key, heat - DECAY);
    }
  }

  /**
   * Record activity at a graph-space coordinate.
   * @param {number} worldX
   * @param {number} worldY
   */
  recordActivity(worldX, worldY) {
    const { GRID_SIZE, INCREMENT, MAX_HEAT } = FlowHeatmap;
    const col = Math.floor(worldX / GRID_SIZE);
    const row = Math.floor(worldY / GRID_SIZE);
    const key = `${col},${row}`;

    const currentHeat = this.activityMap.get(key) || 0;
    this.activityMap.set(key, Math.min(currentHeat + INCREMENT, MAX_HEAT));
  }
}
