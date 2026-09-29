/**
 * @file Pure helpers for the MVP "Filesystem graph editor" (work doc #12).
 *
 * Kept dependency-free so the file-naming, 2-space JSON serialization,
 * auto-placement, and write-debounce logic can be unit-tested without a
 * Worker or browser File System Access context.
 */

/**
 * Minimal structural view of a noflo {@link Graph} as used by these helpers.
 *
 * @typedef {Object} SerializableGraph
 * @property {() => any} toJSON Serializes the graph to fbp-graph JSON.
 * @property {Array<GraphEntity>} [nodes] Nodes carrying optional coordinates.
 * @property {Array<GraphEntity>} [initializers] IIPs carrying optional coordinates.
 * @property {any} [inports] Exported inports (read by the editor only).
 * @property {any} [outports] Exported outports (read by the editor only).
 * @property {Array<any>} [edges] Edges (read by the editor only).
 */

/**
 * @typedef {Object} GraphEntity
 * @property {string} [id]
 * @property {string} [component]
 * @property {{ x?: number, y?: number, [key: string]: any }} [metadata]
 */

/** Default debounce window for auto-save, in milliseconds. */
export const DEFAULT_SAVE_DEBOUNCE_MS = 1000;

/** Default padding (px) around auto-placed graph entities. */
export const DEFAULT_PLACEMENT_PADDING = 50;

/** Default width budget (px) before auto-placement wraps to a new row. */
export const DEFAULT_PLACEMENT_MAX_WIDTH = 1200;

/** Default width (px) assumed for an unpositioned node when wrapping rows. */
export const DEFAULT_PLACEMENT_WIDTH = 150;

/** Default height (px) assumed for an unpositioned node when wrapping rows. */
export const DEFAULT_PLACEMENT_HEIGHT = 100;

/**
 * Canonical on-disk filename for a graph, given a human-friendly name.
 *
 * @param {string} name Graph name without extension.
 * @returns {string} `${name}.graph.json`.
 */
export function graphFileNameFor(name) {
  return `${name}.graph.json`;
}

/**
 * Serializes a graph to 2-space JSON and writes it to the directory.
 *
 * If the source file was an `.fbp` file, it is written out under the converted
 * `.graph.json` name; otherwise the original name is kept.
 *
 * @param {FileSystemDirectoryHandle} directoryHandle Target directory.
 * @param {string} originalFileName Current file name (`.fbp`, `.json`, or `.graph.json`).
 * @param {SerializableGraph} graph Graph to serialize via `toJSON()`.
 * @returns {Promise<string>} The file name that was written.
 */
export async function saveGraphAsJson(
  directoryHandle,
  originalFileName,
  graph,
) {
  const fileName = originalFileName.endsWith(".fbp")
    ? `${originalFileName.replace(/\.fbp$/, "")}.graph.json`
    : originalFileName;
  const json = JSON.stringify(graph.toJSON(), null, 2);
  const fileHandle = await directoryHandle.getFileHandle(fileName, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(json);
  await writable.close();
  return fileName;
}

/**
 * Assigns `x`/`y` coordinates to graph entities (nodes and IIPs) that lack them.
 *
 * Placement begins just to the right of the existing bounding box and wraps to
 * a new row when the width budget is exceeded. Entities that already carry
 * coordinates are left untouched.
 *
 * @param {SerializableGraph} graph Graph to mutate in place.
 * @param {{ padding?: number, maxWidth?: number, defaultWidth?: number, defaultHeight?: number }} [options]
 * @returns {number} Number of entities that were assigned coordinates.
 */
export function placeMissingElements(graph, options = {}) {
  const padding = options.padding ?? DEFAULT_PLACEMENT_PADDING;
  const maxWidth = options.maxWidth ?? DEFAULT_PLACEMENT_MAX_WIDTH;
  const defaultWidth = options.defaultWidth ?? DEFAULT_PLACEMENT_WIDTH;
  const defaultHeight = options.defaultHeight ?? DEFAULT_PLACEMENT_HEIGHT;

  /** @type {Array<GraphEntity>} */
  const elements = [...(graph.nodes ?? []), ...(graph.initializers ?? [])];

  const missing = elements.filter(
    (el) => el.metadata?.x === undefined || el.metadata?.y === undefined,
  );
  if (missing.length === 0) return 0;

  let maxX = 0;
  let maxY = 0;
  for (const el of elements) {
    if (el.metadata?.x !== undefined && el.metadata?.y !== undefined) {
      maxX = Math.max(maxX, el.metadata.x);
      maxY = Math.max(maxY, el.metadata.y);
    }
  }

  let currentX = maxX > 0 || maxY > 0 ? maxX + padding : padding;
  let currentY = padding;
  let maxRowHeight = 0;

  for (const el of missing) {
    el.metadata = el.metadata ?? {};
    el.metadata.x = currentX;
    el.metadata.y = currentY;

    if (currentX + defaultWidth > maxWidth) {
      currentX = padding;
      currentY += maxRowHeight + padding;
      maxRowHeight = 0;
    }
    currentX += defaultWidth + padding;
    maxRowHeight = Math.max(maxRowHeight, defaultHeight);
  }

  return missing.length;
}

/**
 * @typedef {Object} TimerSink
 * @property {typeof setTimeout} setTimeout
 * @property {typeof clearTimeout} clearTimeout
 */

/** Default scheduler: the global timers of the current realm. */
const DEFAULT_TIMER = { setTimeout, clearTimeout };

/**
 * Creates a debounced writer that coalesces rapid calls into a single write.
 *
 * @param {() => (Promise<void> | void)} writeFn Async writer invoked after the quiet period.
 * @param {number} [delayMs] Quiet period; defaults to {@link DEFAULT_SAVE_DEBOUNCE_MS}.
 * @param {TimerSink} [timer] Scheduler to use (injectable for deterministic tests).
 * @returns {{ schedule: () => void, flush: () => Promise<void>, cancel: () => void }}
 */
export function createDebouncedSaver(
  writeFn,
  delayMs = DEFAULT_SAVE_DEBOUNCE_MS,
  timer = DEFAULT_TIMER,
) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let handle = null;

  const run = async () => {
    handle = null;
    try {
      await writeFn();
    } catch (err) {
      console.error("Debounced save failed:", err);
    }
  };

  return {
    schedule() {
      if (handle !== null) timer.clearTimeout(handle);
      handle = timer.setTimeout(run, delayMs);
    },
    async flush() {
      if (handle !== null) {
        timer.clearTimeout(handle);
        handle = null;
      }
      await run();
    },
    cancel() {
      if (handle !== null) {
        timer.clearTimeout(handle);
        handle = null;
      }
    },
  };
}
