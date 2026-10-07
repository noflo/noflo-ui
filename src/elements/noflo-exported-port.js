/**
 * FlowExportedPort Web Component
 * A round pseudonode representing an exported port.
 * Follows the architecture defined in SPEC.md.
 *
 * Rendered as the system boundary, not a processing node (guidelines §9):
 * a cyberpunk "data socket" — neon ring around a hollow dark center — or
 * a tube "terminus/interchange station" — small circle, white fill, thick
 * colored border. The ring carries the sub-flow's route color via
 * --port-route-color (accent fallback); entity ages apply through
 * `state-<age>` classes (the `age` property; data wiring arrives with
 * work document #15).
 */
import { mirrorBodyState } from "./body-state.js";

export class FlowExportedPort extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._x = 0;
    this._y = 0;
    this._size = 30; // Exported ports might be smaller
    this._name = "";
    this._direction = "out"; // default to out
  }

  /**
   * The entity age (work document #41 scope 3, guidelines §9): one of the
   * four Ages vocabulary states applied to this element only, overriding
   * the ambient environment age for its own rendering. `null` follows the
   * environment. The status data that drives it arrives with work
   * document #15; the visual channel is already live.
   *
   * @param {"abstract" | "golden" | "offline" | "crashed" | null} val
   */
  set age(val) {
    const valid =
      val === "abstract" ||
      val === "golden" ||
      val === "offline" ||
      val === "crashed";
    for (const age of ["abstract", "golden", "offline", "crashed"]) {
      this.classList.toggle(`state-${age}`, valid && val === age);
    }
  }

  /** @returns {"abstract" | "golden" | "offline" | "crashed" | null} */
  get age() {
    const ages = /** @type {const} */ ([
      "abstract",
      "golden",
      "offline",
      "crashed",
    ]);
    for (const age of ages) {
      if (this.classList.contains(`state-${age}`)) return age;
    }
    return null;
  }

  set direction(val) {
    this._direction = val;
    this.classList.toggle("port-in", val === "in");
    this.classList.toggle("port-out", val === "out");
  }

  get direction() {
    return this._direction;
  }

  set position({ x, y }) {
    this._x = x;
    this._y = y;
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
  }

  get position() {
    return { x: this._x, y: this._y };
  }

  get size() {
    return this._size;
  }

  set size(val) {
    this._size = val;
    if (this.shadowRoot) {
      this.style.setProperty("--exported-port-size", `${val}px`);
    }
  }

  set name(val) {
    this._name = val;
    const nameEl = this.shadowRoot?.querySelector(".port-name-label");
    if (nameEl) {
      nameEl.textContent = val;
    }
  }

  get name() {
    return this._name;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    // Re-mirror the body's animation setting: the shadow gates its pulse
    // and glitch animations on it (mirrored onto the host, shadow styles
    // cannot select light-DOM ancestors)
    mirrorBodyState(this, ["data-theme", "data-animations"]);
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          width: var(--exported-port-size, 20px);
          height: calc(var(--exported-port-size, 20px) + 20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: grab;
          user-select: none;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* The system boundary (guidelines §9): a pseudo-node styled as the
           edge of the graph, not a processing node. Cyberpunk renders it
           as a data socket — a neon ring around a hollow, recessed dark
           center; tube renders it as a terminus/interchange station — a
           small circle, white fill, thick colored border. The ring takes
           the sub-flow's route color, falling back to the accent */
        .port-box {
          width: calc(var(--exported-port-size, 20px) * 0.75);
          height: calc(var(--exported-port-size, 20px) * 0.75);
          box-sizing: border-box;
          background-color: var(--ui-bg);
          border: 2px solid var(--port-route-color, var(--ui-accent));
          border-radius: 50%;
          position: relative;
          box-shadow: 0 0 10px var(--node-glow, transparent);
          transition: opacity 0.2s;
        }
        .port-name-label {
          font-size: 10px;
          font-family: SourceCodePro, monospace;
          color: var(--node-text);
          text-align: center;
          margin-top: 2px;
          white-space: nowrap;
          opacity: clamp(0, (var(--zoom-scale) - 0.5) * 100, 1);
          pointer-events: none;
        }
        :host([selected]) {
          transform: scale(1.15);
          z-index: 10;
        }
        :host([selected]) .port-box {
          box-shadow: 0 0 15px var(--node-glow), 0 0 30px var(--node-glow);
          border-color: var(--ui-accent);
          border-width: 3px;
        }

        /* Entity ages (guidelines §9): the element age wins for this
           element's own rendering; the environment age keeps governing the
           atmosphere. Data wiring arrives with work document #15 */

        /* Abstract — drafting: dimmed, thin, no glow in either theme */
        :host(.state-abstract) .port-box {
          border-width: 1px;
          border-color: color-mix(
            in srgb,
            var(--port-route-color, var(--ui-accent)) 55%,
            transparent
          );
          box-shadow: none;
        }
        :host([data-theme="tube"].state-abstract) .port-box {
          border-width: 2px;
          border-color: var(--node-subtext);
        }

        /* Golden — live: the route ring glows (cyberpunk) or bolds
           (tube); a small inner ring pulses in the route color */
        :host(.state-golden) .port-box {
          border-color: var(--port-route-color, var(--ui-accent));
          box-shadow: 0 0 10px var(--port-route-color, var(--ui-accent));
        }
        :host(.state-golden) .port-box::after {
          content: "";
          position: absolute;
          inset: 2px;
          border-radius: 50%;
          border: 1px solid var(--port-route-color, var(--ui-accent));
          animation: port-pulse 2s ease-in-out infinite;
        }
        :host([data-theme="tube"].state-golden) .port-box {
          border-width: 4px;
          box-shadow: none;
        }

        /* Offline — suspended service: grey ink, no glow; the tube
           border goes dashed, echoing the suspended-service wire grammar */
        :host(.state-offline) .port-box {
          border-color: var(--ui-age-offline);
          box-shadow: none;
        }
        :host([data-theme="tube"].state-offline) .port-box {
          border-width: 3px;
          border-style: dashed;
        }

        /* Crashed — failure: the theme's error red takes the ring; the
           cyberpunk socket glitches */
        :host(.state-crashed) .port-box {
          border-color: var(--ui-age-crashed);
          border-width: 3px;
          box-shadow: 0 0 10px var(--ui-age-crashed);
          animation: port-glitch 0.3s steps(2) infinite;
        }
        :host([data-theme="tube"].state-crashed) .port-box {
          border-width: 4px;
          box-shadow: none;
        }

        @keyframes port-pulse {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes port-glitch {
          0%,
          100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(1px, -1px);
          }
          50% {
            transform: translate(-1px, 1px);
          }
          75% {
            transform: translate(1px, 1px);
          }
        }
        /* Motion gates (guidelines §11): both the pulse and the glitch
           stop for reduced-motion users and behind the
           data-animations="off" hook mirrored from body */
        @media (prefers-reduced-motion: reduce) {
          :host(.state-golden) .port-box::after,
          :host(.state-crashed) .port-box {
            animation: none;
          }
        }
        :host([data-animations="off"].state-golden) .port-box::after,
        :host([data-animations="off"].state-crashed) .port-box {
          animation: none;
        }
      </style>
      <div class="port-box port"></div>
      <div class="port-name-label">${this._name}</div>
    `;
  }
}

customElements.define("noflo-exported-port", FlowExportedPort);
