/**
 * @file Pointer-state publishing (work document #41, guidelines §1/§13):
 * the input model branches on the active pointer, not the device class —
 * hybrid devices (iPad + trackpad, touch laptops) break `pointer: coarse`
 * checks. A window-level capture listener mirrors the last pointer type as
 * `data-input` (`touch`/`mouse`/`pen`) on `<body>`, next to the other body
 * state attributes. CSS consumes it through `--ui-target` in main.css
 * (44px touch floor, 24px WCAG 2.2 mouse minimum); the editor additionally
 * mirrors the attribute onto itself. Capture phase so the value records
 * even when canvas handlers stop propagation.
 */

/**
 * Starts publishing the last pointer type as `data-input` on the document
 * body.
 *
 * @returns {void}
 */
export function trackInputState() {
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
