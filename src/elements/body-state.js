/**
 * @file Body-state mirroring (work document #41, guidelines §1): the body
 * carries the app-level state attributes (`data-theme`, `data-age`,
 * `data-animations`, `data-input`), but Shadow DOM styles cannot select
 * light-DOM ancestors — only custom properties pierce the boundary. For
 * attribute-based selectors (`:host([data-animations="off"])`) an element
 * mirrors the body's value onto itself. Pure state publishing: the mirror
 * copies values, CSS decides the look.
 */

/**
 * Mirrors the named state attributes from `<body>` onto the element.
 *
 * @param {HTMLElement} element
 * @param {string[]} names
 */
export function mirrorBodyState(element, names) {
  const body = element.ownerDocument?.body;
  if (!body) return;
  for (const name of names) {
    const value = body.getAttribute(name);
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }
}
