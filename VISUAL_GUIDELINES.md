# NoFlo UI Visual Guidelines

Visual design rules for the NoFlo Development Environment. Primary audience is **LLM coding agents**: when you create or modify anything that renders — canvas, elements, panels, modals, menus — follow this document. It complements `SPEC.md` (architecture) and the visual work documents (#1 layered canvas, #2 heatmap, #3 Ages & themes, #5 interactions, #6 color scheme), and adapts some ergonomic and form rules from the Signal K webapp visual specification. The document is **self-contained**: every rule is fully described here in words, with no reliance on external images or design files. Historical sketches and mockups informed these rules — where their geometry predates the circular node language, the text here wins.

## 1. The core model (read this first)

Everything visual is driven by **two attributes on `<body>` and CSS custom properties**:

- `data-theme` — `cyberpunk` (default, dark) or `tube` (light, London Underground)
- `data-age` — `abstract`, `golden`, `offline`, or `crashed` (the environment's processing state)

The editor element mirrors the age as a `state-<age>` class on itself. No JavaScript may compute colors, shadows, stroke widths, or theme branches at render time: components render one structure, and CSS resolves the theme × age matrix through custom properties, which pierce Shadow DOM boundaries for free.

**MUST** express every visual decision as a CSS custom property lookup. **NEVER** hardcode a color, radius, font, or dash pattern in an element or component. **NEVER** duplicate theme logic in JS beyond setting the two attributes.

## 2. Tech constraints

- Vanilla Web Components (`HTMLElement`), native ES Modules, standard DOM APIs. No frameworks, no external CSS frameworks, no build-time CSS preprocessing.
- SVG (light DOM) renders the graph scene; Web Components render nodes and UI chrome, each styling itself in its Shadow Root.
- Fonts are vendored webfonts loaded in `src/main.css`: `SourceCodePro` (all text) and `Font Awesome 7 Free` (icons). Do not add font CDNs or new font files without changing this document.
- Licensing: the project is EUPL-1.2. Any external software libraries, fonts, icons, or snippets must be compatible with EUPL-1.2.

## 3. Where styles live

- `src/main.css` — glass-level surfaces (page background, controls, dialogs) and the **theme × age variable definitions** (`:root` cyberpunk defaults, `[data-theme="tube"]` overrides, `.state-*` age overrides).
- Element Shadow Roots (`src/elements/*.js`) — component-internal styles, written against the semantic variables. Shadow styles must never re-declare theme values, only consume them.
- The visual contract between themes and elements is the variable set below. If you need a new semantic variable, add it in `main.css` for **both** themes (and all four ages where relevant) before consuming it.

### Semantic variable reference

| Variable | Meaning |
| --- | --- |
| `--ui-bg` | Canvas/page background (age-sensitive in cyberpunk) |
| `--ui-accent` | Primary accent for controls, focus, active states (age-sensitive) |
| `--ui-panel-border`, `--ui-border` | Panel and control borders (age-sensitive) |
| `--ui-radius` | Corner radius (6px cyberpunk, 0 tube) |
| `--node-bg`, `--node-border`, `--node-icon` | Node disc background, ring, icon color |
| `--node-text`, `--node-subtext` | Primary and muted text on/around nodes |
| `--node-glow` | Node glow color (transparent in tube and calm ages) |
| `--node-stroke-width`, `--node-ring-inset`, `--node-size` | Node geometry knobs |
| `--flow-color`, `--flow-dash` | Edge color and dasharray (dash = not live) |
| `--edge-width`, `--edge-color`, `--edge-hit-width` | Edge rendering and the 60px invisible hit area |
| `--dot-color` | Background grid dots |
| `--heatmap-color` | Ambient heatmap blocks |
| `--route-0` … `--route-9` | The ten route colors of the active theme |
| `--ui-age-calm`, `--ui-age-activity`, `--ui-age-attention`, `--ui-age-offline` | Semantic status colors for HUD chips, badges, status lines (calm = settled/synced, activity = work in flight, attention = demands the user, offline = disconnected) |
| `--zoom-scale` | Published by the camera; drives level-of-detail via container queries |
| `--port-route-color` | Set per expanded node from the connected edge's route (accent fallback when unconnected) |

## 4. Theme personalities

The two themes are not recolorings of one design — they are two designs sharing one structure.

**Cyberpunk (default):** dark glassmorphism. Semi-transparent panels with `backdrop-filter: blur()`, 1px neon borders, glow on live/selected elements, 6px radius, `SourceCodePro` monospace everywhere. Inspired by the original NoFlo Kickstarter sketches (Tron lineage).

The canonical cyberpunk composition is a dark blueprint canvas showing three truths at once: a **draft region** on the left where muted grey stub nodes wait with thin monochrome wires, the **live graph** at center glowing in route colors, and a **crashed node** on the right fractured in red. Every element of that composition is a motif you must follow when adding or touching cyberpunk visuals:

- **Blueprint backdrop:** dot grid plus a faint circuit-trace texture; panels framed with corner brackets. Backdrop decoration stays barely-there — it must never compete with nodes and wires for attention.
- **Node discs:** circular icon discs with a two-line caption — the name in `--node-text`, and a small uppercase tracked status word beneath, colored by state (running → activity cyan, draft → muted grey, crashed → error red, component type/library → secondary violet).
- **Wire tubes:** edges read as thick rounded tubes with a soft glow and directional arrowheads, colored by route. Prominence scales with age: draft wires thin and monochrome, live wires thick and glowing, dead wires dashed.
- **Controlled glow:** glow is a privilege of live elements — node rings and active wires. Backgrounds, text, and panels never glow.
- **Processing rings:** concentric dashed rings pulsing around an actively processing node (the "core engine" motif) — the golden-age per-node activity affordance.
- **Crash treatment:** error-red glow and jagged fracture marks that visibly break the disc's ring — the failure literally cracks the visual language rather than just recoloring it.

**Tube:** light brutalism. Pure white opaque panels, thick (2–3px) black borders, `border-radius: 0`, hard offset drop shadows, no glow, sans-serif UI text. Designed for daylight and e-ink: it must stay legible with no anti-aliasing frills.

The theme is a direct transcription of Harry Beck's London Underground diagram, and the reason it works is that flow-based programming is topological in the same way transit networks are: the meaning lives in *what connects to what*, not in where things sit on the canvas. Beck's 1933 diagram threw away geography and kept only the logic of connections, rendered as clean geometry with a small set of highly distinguishable line colors — exactly what a graph editor needs. Each tube-theme rule derives from that design language:

- **The canvas is paper**: flat white, ink-only rendering. Ink doesn't glow — glow is the cyberpunk theme's privilege, and e-ink has no backlight.
- **Lines are the message**: thick, uniformly weighted strokes in a small set of highly distinguishable colors. Hence the 8px edges and 8px node rings, and the ten authentic TfL line colors as the route palette — a flow reads as a transit line, down to its default name (Victoria, Northern…).
- **Schematic geometry**: Beck's world is horizontals, verticals, and 45° turns with sharp corners — chrome honors this with `border-radius: 0` and even-weight bold borders.
- **Signage type**: clean sans-serif labels in the Johnston/Gill Sans tradition of transit signage, not terminal type.
- **Dashed means not running**: offline wires render dashed, reusing the transit convention of marking suspended services.
- **Printed tiles**: panels are opaque white cards with hard offset shadows — printed plates pasted on the diagram.
- **Groups are tariff zones, routing-only nodes are interchanges**: minor elements of the network get simplified schematic treatment (see work document #35).

The payoff is environmental: ink on paper is the original bright-ambient medium, which is why this theme doubles as the daylight and e-ink variant.

**MUST** give every new surface both treatments via the variables (radius, border, background, font stack all resolve from variables). A surface that only looks right in one theme is a bug.

## 5. Ages — state-driven atmosphere

The environment's age expresses system health at a glance, from across the room. Ages apply to the whole environment, not just a status icon.

| Age | Meaning | Visual grammar |
| --- | --- | --- |
| `abstract` | Drafting, stopped, not processing | Muted, low-contrast, monochrome-ish; thin solid wires; reads as blueprint |
| `golden` | Live and processing | High saturation, neon borders + glow (cyberpunk only), brighter canvas |
| `offline` | Disconnected, standby | Desaturated grey, dashed wires, no animation, muted accent everywhere |
| `crashed` | Failure | Error color takes over borders, accent, nodes; dashed wires; the established look visibly breaks |

Rules:

- Ages exist at **two scopes**. The **environment age** (`data-age` on `<body>`, mirrored as `state-*` on the editor) is the ambient atmosphere — canvas brightness, `--ui-accent`, panel borders, animation posture — and **MUST** be set only at the root, never per-widget. **Entity ages** apply the same four-state vocabulary to individual nodes, edges, or components: a crashed node in a live graph, an offline remote component among running ones, sketched stubs in a processing flow. An entity age is a `state-*` class on the entity itself, so the same palette variables resolve locally and override the inherited ambient values for that element only. Both scopes are pure CSS inheritance — never JS-computed colors.
- **Precedence**: the entity age wins for the entity's own rendering; the environment age keeps governing the atmosphere (canvas, chrome, accent). An edge takes the age of its least-live endpoint — a wire into an offline node renders dashed even in a golden environment.
- **Match age intensity to consequence.** Any surface can carry an entity age — a form control included — but reserve the crashed grammar for real failure (a crashed process, a broken connection, a failed save). A validation error on an input is an **attention** state (`--ui-age-attention`), not a crashed entity: spending the environment's alarm language on recoverable input mistakes trains users to ignore it.
- The age vocabulary doubles as the **sketch → specify → implement** ladder: unimplemented sketch parts read `abstract`, running parts read `golden` — as entity ages when they coexist in one graph (a stub sits abstract inside a golden flow). Use it for per-component status before inventing new states.
- Disconnection from a runtime **must** present as the offline age (plus the sync panel's offline indicators), not a small icon.
- `--ui-accent`, panel borders, input borders, and primary buttons follow the age (crashed shifts them to the error color; offline mutes them; in tube-offline input borders turn dashed).
- Wire dash = not flowing. `--flow-dash` is `none` (solid) in abstract/golden and `5, 5` in offline/crashed. Keep that grammar for any new line-like indicator.
- Crash gets a treatment beyond recoloring: red glow, fracture marks on the node disc, and the status caption swapped for an `Error: …` line.
- Any age indicator the HUD surfaces follows the **Current Age / Goal Age** pairing — show where the environment is now and where it is headed (e.g. `Current: Abstract · Goal: Golden`), not just a state word.

## 6. Color rules

- **MUST** consume semantic variables and route variables only. **NEVER** introduce raw hex/rgb literals in element styles. For tints and translucent variants use `color-mix(in srgb, var(--semantic) X%, transparent)`.
- **Route colors** (`--route-0`…`--route-9`) color a flow's edges, and — when a node belongs to only that flow — the node's ring or icon, or the whole disc fill for the strongest emphasis (picture a flow whose every edge is yellow, terminating in a node with its entire disc filled yellow). Routes are a core orientation feature; keep them high-contrast against both canvases.

| Route | Cyberpunk | Tube (TfL line) | Default name |
| --- | --- | --- | --- |
| 0 | Ice White `rgb(224,247,250)` | Northern `rgb(0,0,0)` | Northern |
| 1 | Coral Red `rgb(255,82,82)` | Central `rgb(227,32,23)` | Central |
| 2 | Bright Tangerine `rgb(255,152,0)` | Overground `rgb(238,124,14)` | Overground |
| 3 | Chartreuse `rgb(198,255,0)` | Circle `rgb(255,211,0)` | Circle |
| 4 | Mint Green `rgb(105,240,174)` | District `rgb(0,120,42)` | District |
| 5 | Bioluminescent Aqua `rgb(24,255,219)` | DLR `rgb(0,164,167)` | DLR |
| 6 | Electric Cyan `rgb(0,229,255)` | Victoria `rgb(0,152,212)` | Victoria |
| 7 | Azure Blue `rgb(68,138,255)` | Piccadilly `rgb(0,54,136)` | Piccadilly |
| 8 | Neon Violet `rgb(176,136,255)` | Elizabeth `rgb(105,80,161)` | Elizabeth |
| 9 | Hot Magenta `rgb(255,64,129)` | Metropolitan `rgb(155,0,86)` | Metropolitan |

- Default route names come from the Tube line names regardless of active theme, and are used when the user has not named a route.
- Route application follows the route of the connected edge (e.g. expanded-node port pills via `--port-route-color`, route cycler over the whole edge selection).
- The `--ui-age-*` semantic colors are defined by mapping onto the route palette, so both themes follow automatically. When you need a status color (success/working/error/disconnected), pick the age semantic, not a literal.

## 7. Typography

- Base and data font: `SourceCodePro, monospace` (cyberpunk). Tube switches UI chrome to sans-serif via the theme override; components should inherit rather than pin families.
- Headers/labels: uppercase, small (~0.85rem), bold, tracked out (`letter-spacing: 0.1em`).
- Data values (the payload): large, bold, `--node-text`, with `font-variant-numeric: tabular-nums` so live-updating numbers don't jitter.
- Timestamps, coordinates, identifiers: monospace, muted (`--node-subtext`).
- **MUST NOT** use font-size or family to communicate state — use the age/route/semantic color variables.

## 8. Canvas layering & rendering

Strict layer stack (from work document #1):

1. **Underlay** — 2D `<canvas>` for ambient effects only (heatmap), painted behind everything.
2. **SVG scene** — infinite `<svg>` with the dot grid pattern, edge `<path>`s, node positioning.
3. **Web Component nodes** — `<noflo-node>`, `<noflo-iip>` etc. positioned over the SVG.
4. **UI overlay** — radial menus, selection pills, corner HUD, modals. Transparent hit-layer rules apply.

Rules:

- **MUST** use a single delegated `pointerdown` listener on the editor wrapper with `event.target.closest(...)` resolution; **NEVER** attach per-node/port listeners (they die on re-render and leak). Delegate clicks on the shadow root where re-renders replace children.
- Apply `touch-action: none` to the editor container so pans and pinches never fight native scrolling.
- Level-of-detail is CSS, not JS loops: publish `--zoom-scale` and use container queries (e.g. hide port labels below 0.5 zoom, add the `detailed` class at ≥ 2x zoom for datatype tags).
- Edge hit areas (`--edge-hit-width`, 60px) are invisible; visible stroke width stays `--edge-width`.
- The heatmap (and any ambient visualization) **must** run on a slow tick (~500ms `setInterval`), quantize to grid cells, keep state in a `Map` of active cells only, and prune cooled cells. **NEVER** use `requestAnimationFrame` for ambient effects — that is reserved for user-attached motion.
- Animations for structural changes are CSS: springs, transitions, View Transitions API for group operations. No JS interpolation loops.

## 9. Node & port anatomy

Nodes are circular; ports distribute along the perimeter by trigonometry (outports right hemisphere, inports left). The expanded (selected) node has a fixed anatomy — follow it rather than inventing new layouts:

- Node name moves **above** the circle; component name sits in a band inside the circle's bottom; the ring stays continuous and unbroken over all bands.
- The preview area is a **full disc inside the circle** (inset ≈15px so ports clear it), visually cut off top and bottom by the icon and component-name bands, which overlay it filled with `--node-bg`.
- Between circle and status line sits the **navigation depiction**: mini graph for subgraphs, code glyph for implemented components, "Not implemented" marker for stubs (the sketch → specify ladder made visible). Clicking it triggers navigate-down. Netpbm previews from a running process render here when available.
- The **status line** sits below the circle and uses the Ages vocabulary; the test count joins it when tests exist.
- Port pills (expanded state): single line — dot, name, datatype — with the **datatype on the pill's outer edge** (inports read `string IN ◯`, outports `◯ OUT string`). Pills hug their ports; the pill's dot lands exactly on the port element (one dot, not two). Arrayport instance pills run one size smaller and cluster nearly touching (1px gaps) while regular pills keep ~6px breathing room; same-side pills fan out vertically when dense, sorted by port angle. Pill color follows the connected edge's route.
- In the non-expanded state, port labels sit **outside** the circle; ports read top to bottom in definition order on both sides.
- Per-node status uses a **two-line caption stack**: the name in `--node-text` and a small uppercase status word beneath it, colored by the age semantics (running / draft / crashed), so node state is legible without selecting the node.
- Groups render as padded, labeled regions **behind** member nodes; padding must exceed half a node plus half a grid cell (the shared `groupBounds` helper, 48px) so adjacent-cell drops still land inside.

## 10. Interaction visuals

- **Cursor states (mouse):** `grab` hovering grabbable things (nodes, ports), `grabbing` while dragging, `no-drop` over invalid drop targets. Keyboard and touch equivalents must exist for every mouse interaction (NUI primary, WIMP fallback, CLI power — all three paradigms dispatch the same intents).
- **Selection:** selected nodes enlarge (scale ~1.35, spring transition); selected edges get a legible highlight; multiple selection shows the **selection pills** at top center ("4 nodes ×"). Never rely on color alone for selection — scale/outline as well.
- **Compatibility guiding:** while dragging a wire, compatible ports grow, incompatible ones shrink. The same guiding applies to component pickers (splice/pick filtering by datatype chain).
- **Ghost node (drag-to-add):** dragging a wire from a port across empty canvas shows a ghost at the nearest valid grid position — a **dashed `--ui-accent` circle** with a faint accent tint, a muted "Add New Node" caption, and the wire's endpoint dot docked where the new port will sit. The ghost is a promise, not a node: no fill content, no ports, no real label; it springs in and pulses softly until drop. (Older designs drew this affordance with rounded-rectangle nodes; the affordance carries over, the geometry does not — ghosts are dashed circles.)
- **Peer ghosts:** a remote collaborator's in-flight drag renders with the same dashed-accent-circle construction (`.peer-ghost`) plus the peer's label, so mesh-synced editing is visible on the canvas; same motion gates as everything else.
- **Radial (pie) menus:** opened by right-click or long-press, centered on the pointer; dismisses on selection, click-away, pan, or zoom; supports press-and-slide-to-select on touch. Visual construction (as implemented in `<noflo-radial-menu>`):
  - A full dark disc — the panel treatment (`rgba(var(--ui-bg), 0.7)` + blur in cyberpunk), not a floating list.
  - A finger-sized (~44px) center hub holding the node icon in node menus; the hub is a `--node-bg` circle with a `--node-border` ring.
  - Items are a monochrome icon over an uppercase tracked label in `--node-text`, placed radially at ~60px from center, one item per 45° section, with the **entire section as the hit area**.
  - The bottom-right three sections stay free (right-handed finger reach) — **Remove sits bottom-left, never bottom-right**.
  - Slot positions are **consistent across menus**. Canonical slots: Cancel top-left, Open top-right, Subgraph right, Move up bottom, Remove bottom-left.
  - Hover/active lights the **whole 45° wedge** — either an accent outline with a faint accent tint across the wedge, or the item inverted (`--ui-accent` background, `--ui-bg` text) as the implementation does. Either way, the section is the highlight unit, never just the icon.
- **Panels & overlays over canvas:** semi-transparent dark backgrounds with sharp 1px borders (cyberpunk); opaque white with thick black borders (tube). Floating controls must not swallow canvas gestures. Corner elements are constrained to their corner (a third of the viewport minus margins) and must never overrun the selection pills.
- **Newness:** nodes added since the last render spring in from a zero-size circle (`cubic-bezier(0.34, 1.56, 0.64, 1)`) and shimmer (accent glow pulse) for a few seconds — this is how mesh-sync additions from collaborators get noticed. First sight of a graph (boot/switch) seeds silently — no mass shimmer.

## 11. Motion rules

- Motion is CSS-driven and honors `prefers-reduced-motion` **and** the `data-animations="off"` attribute hook. **MUST** gate every new animation behind both.
- Ambient processes (heatmap, connection pulses) never animate at 60fps; slow ticks only.
- **No marching ants**: wires never run continuous dash or flow animations. Liveness is expressed through the age palette (saturation, glow), per-node processing rings, and the heatmap — not by endlessly animating edges. The canvas stays calm and batteries stay alive.
- Offline animates nothing except at most a slow heartbeat opacity pulse.

## 12. Panels, forms, and controls

- Strip default browser styling (`appearance: none`) on inputs, buttons, selects. Controls must feel like hardware: theme-colored 1px borders, transparent or `--ui-bg` backgrounds.
- **Focus states are mandatory** and visible: border/accent transitions to `--ui-accent`. Never remove outlines without providing an alternative.
- Buttons: transparent background, 1px `--ui-accent` border, uppercase monospace; on hover/active invert (accent background, canvas-colored text).
- Text/number inputs: transparent background with a solid bottom border (2px grey → accent on focus); monospace text. Prefer `type="text"` + `inputmode` (`numeric`/`decimal`) over `type="number"`; validate in JS. For signed values beware iOS keypads without a minus key — use plain `type="number"` or a hemisphere/plus-minus toggle.
- **Validation feedback:** an invalid control gets an `--ui-age-attention` border plus an adjacent message in the same semantic — never the crashed age (validation is attention, not failure; see §5). The message sits beside the control it describes, never a global toast for a local problem.
- **Form rows**: rows of *muted label left* (`Input:`, `int:`, `boolean:`) + *control right*, separated by hairlines rather than boxed cards; each row carries a **colored left-edge tick** identifying the input, echoed by the **value color inside the control** — input text is telemetry in a data hue (a cyan URL value, a violet number), not plain white chrome; units sit right-aligned inside the control as muted suffixes (`px`); booleans are square controls with a large accent checkmark; selects are dark panels with a chevron; sliders fill their track in accent with the numeric value right-aligned; sections headline as `Label: Name` (`Input: Build`, `Output: Build`).
- Modals and pickers **must** have an opaque, theme-driven background with the panel border — a transparent picker over a live graph is unreadable and has caused regressions before.
- Typed forms (JSON forms) derive their schema from port datatypes; render strings/numbers/booleans/objects/arrays with appropriate widgets rather than raw JSON text where possible.
- Status badges and HUD chips use `--ui-age-*` semantics with `color-mix` tints (see sync panel) — never bespoke status colors.
- **Pseudo-consoles** (logs, event history): monospace 3-column grid (timestamp muted / message main / right-aligned bracketed status in semantic color, e.g. `[ OK ]`, `[ FAIL ]`); behave as a circular buffer with a hard max line count enforced in JS (drop oldest nodes on append).
- **Chrome panels around the canvas** — keep the following grammar when building the corner HUD, inspector, and sync panel:
  - **Inspector sidebar:** graph/project title with breadcrumb path in accent links and a version line; typed input rows with a colored left-edge tick per input; units as suffixes (`px`) rather than separate columns; datatype-appropriate controls (text, number+unit, checkbox, select, slider); a subgraph section with a mini-graph thumbnail and a `View` link; an output section showing line count + byte size above a line-numbered, syntax-highlighted preview.
  - **Presence (collaborators):** avatar discs whose **ring and brightness** carry presence — active = full accent ring, online = ring, offline = dimmed and desaturated — with an uppercase status word (ACTIVE / ONLINE / OFFLINE) beneath the name; inviting is a dashed "+" disc. The sync panel speaks this grammar with `--ui-age-*` colors.
  - **Ambient metrics:** small sparkline charts (e.g. packets sent) in the activity color with the current value emphasized and the time axis muted; slow ticks only, never rAF.
  - **Status clusters:** connection/runtime state as a word + icon pair — the word carries the semantic color (`Disconnected` in attention color), the icon stays monochrome; the action affordance (run/play) sits beside the state it would change.
  - **Minimap:** tiny node/edge dots and lines, everything muted except the active path or viewport.
  - **Zoom controls:** square `+`/`−` buttons in the panel treatment, docked to the canvas edge.
- **MUST NOT** use `window.prompt`/`window.confirm`/`window.alert` anywhere — all editing flows through modals, pickers, and the signature editor.

## 13. Responsiveness & ergonomics

- Touch targets: **minimum 44×44px** for all interactive controls (radial menu center, pills, buttons). The editor is touch-first; mouse is the fallback, not the target.
- Layouts are fluid: `clamp()`, CSS grid (`auto-fit`/`auto-fill`), flexbox; single-column collapse on phones. Avoid rigid breakpoints where fluid sizing works.
- The UI must remain usable with animations off and on e-ink (tube theme carries this duty: pure luminance contrast, no glow dependency).
- Every touch affordance has a WIMP equivalent (long-press ⇄ right-click, slide-select ⇄ modifier-click) and ideally a command-line path emitting the same intents.

## 14. DOM & performance discipline

- **Granular updates:** cache DOM/element references and update `textContent`/attributes; never re-render a whole component to change a value. (The editor element itself rebuilds per graph render by design — anything inside a node or panel must update in place.)
- Event delegation over per-child listeners wherever children are recreated.
- Keep main-thread work off the hot path: slow ticks for ambient, CSS for motion, worker (Engine) for state. The Glass never computes graph state for rendering decisions it can inherit via CSS or attributes.
- Cap list-like DOM growth (console buffers, logs) with explicit maximums.

## 15. Branding & document meta

- Keep a single source of truth for the app icon; reference it as favicon rather than duplicating assets.
- Register the canvas background in `<meta name="theme-color">` so mobile chrome matches the dark cyberpunk canvas; the tube theme's light canvas may add a media-query variant if desired.

## 16. Agent checklist (before you call UI work done)

- [ ] No literal colors/radii/fonts/dashes in element styles — only semantic variables, defined for **both themes** (and all ages they touch)
- [ ] New semantic variables added to `main.css` for both themes before consumption
- [ ] Works in all four ages, not just golden
- [ ] Touch targets ≥ 44px; touch, mouse, and keyboard paths exist
- [ ] Listeners delegated; survives re-renders; no per-child listeners on replaceable nodes
- [ ] Animations honor `prefers-reduced-motion` and `data-animations="off"`; ambient effects use slow ticks, not rAF
- [ ] Focus states present on all controls; no `prompt`/`alert`/`confirm`
- [ ] Verified in a real browser in **both themes** (cyberpunk and tube) — screenshots for visual changes
- [ ] Smoketests added; `npm run types` and formatting clean
