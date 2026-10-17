/**
 * @file Pointer-state publishing (work document #41, guidelines §1/§13):
 * the input model branches on the active pointer, not the device class —
 * hybrid devices (iPad + trackpad, touch laptops) break `pointer: coarse`
 * checks. At boot the interaction media features guess the primary input
 * synchronously — a mouse/trackpad setup publishes `mouse` before the
 * first paint, so the target sizes are right from the first frame instead
 * of rescaling on the first click. A window-level capture listener then
 * mirrors the last pointer type as `data-input` (`touch`/`mouse`/`pen`) on
 * `<body>`, next to the other body state attributes — the active pointer
 * remains the authority on hybrid devices. CSS consumes it through
 * `--ui-target` in main.css (44px touch floor, 24px WCAG 2.2 mouse
 * minimum); the editor additionally mirrors the attribute onto itself.
 * Capture phase so the value records even when canvas handlers stop
 * propagation.
 */

/**
 * Starts publishing the last pointer type as `data-input` on the document
 * body.
 *
 * @returns {void}
 */
export function trackInputState() {
  // The boot-time guess: the primary input mechanism, read synchronously
  // so the layout state is set before the first paint. `(hover: hover)`
  // plus `(pointer: fine)` is the traditional mouse/trackpad signature;
  // touch and pen keep the 44px floor
  const isMouseSetup =
    window.matchMedia("(hover: hover)").matches &&
    window.matchMedia("(pointer: fine)").matches;
  if (isMouseSetup) {
    document.body.setAttribute("data-input", "mouse");
  }
  window.addEventListener(
    "pointerdown",
    (event) => {
      const type = /** @type {PointerEvent} */ (event).pointerType;
      if (!type) return;
      document.body.setAttribute("data-input", type);
    },
    { capture: true },
  );
}
