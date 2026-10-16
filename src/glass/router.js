/**
 * @file Hash routing for the Glass (work document #23): the URL addresses
 * `#/p/<projectId>/<graphId>`, where the graph id may itself contain
 * slashes for hierarchical subgraphs (`main/A/deep`). Navigation updates the
 * URL; browser back/forward switches graphs via hashchange.
 *
 * Only one project exists today, so the project id defaults to a constant —
 * the route shape anticipates multi-project routing later.
 */

/** Default project id until multi-project management exists. */
export const DEFAULT_PROJECT_ID = "default";

/** The route kinds addressing top-level screens (work document #62):
 * the graph kind keeps the legacy URL shape (no kind segment) so existing
 * links keep working. */
export const SCREEN_KINDS = ["graph", "doc", "component", "spec"];

/**
 * A parsed route: the project id plus either a kind-addressed entity
 * (`kind` + `id`) or a legacy graph id.
 *
 * @typedef {Object} GlassRoute
 * @property {string} projectId
 * @property {string} kind The screen kind (an open vocabulary — new
 *   screens join without router changes; the known kinds get UI).
 * @property {string} id The entity id (the graph id for graph routes).
 * @property {string} graphId The graph id (empty for non-graph screens).
 */

/**
 * @param {string | null | undefined} hash
 * @returns {GlassRoute | null}
 */
export function parseRoute(hash) {
  if (typeof hash !== "string") return null;
  const match = /^#\/p\/([^/]+)\/(.+)$/.exec(hash);
  if (!match) return null;
  const projectId = decodeURIComponent(match[1]);
  const rest = match[2];
  const kinded = /^([^/]+)\/(.*)$/.exec(rest);
  if (!kinded || !SCREEN_KINDS.includes(kinded[1])) {
    return null;
  }
  const id = decodeURIComponent(kinded[2]);
  return {
    projectId,
    kind: kinded[1],
    id,
    // The graph kind's id IS the graph id; other kinds carry none
    graphId: kinded[1] === "graph" ? id : "",
  };
}

/**
 * Builds a graph-route hash (the legacy shape: no kind segment, so
 * existing links keep working).
 *
 * @param {string} projectId
 * @param {string} graphId
 * @returns {string}
 */

/**
 * Builds a screen-route hash (work document #62): the durable URL for
 * each top-level entity — `#/p/<project>/<kind>/<id>`.
 *
 * @param {string} projectId
 * @param {{ kind: string, id: string | null }} screen
 * @returns {string}
 */
export function buildScreenHash(projectId, screen) {
  const project = encodeURIComponent(projectId);
  // The graph kind's hierarchical id keeps its slashes
  const id = (screen.id ?? "main")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  if (screen.kind === "graph") {
    return `#/p/${project}/graph/${id}`;
  }
  return `#/p/${project}/${screen.kind}/${encodeURIComponent(screen.id ?? "")}`;
}

/**
 * @param {import("./router.js").GlassRoute} route
 * @returns {{ kind: string, id: string | null }}
 */
export function routeToScreen(route) {
  return { kind: route.kind, id: route.id };
}

/**
 * Creates the hash router.
 *
 * @param {{
 *   projectId?: string,
 *   defaultGraphId?: string,
 *   onRouteChange?: (route: GlassRoute) => void,
 * }} [options]
 * @returns {{
 *   route: () => GlassRoute,
 *   graphId: () => string,
 *   projectId: () => string,
 *   navigate: (target: string | { kind: string, id: string | null }, options?: { replace?: boolean }) => void,
 *   destroy: () => void,
 * }}
 */
export function createRouter(options = {}) {
  const {
    projectId = DEFAULT_PROJECT_ID,
    defaultGraphId = "main",
    onRouteChange,
  } = options;

  let current = parseRoute(window.location.hash) ?? {
    projectId,
    kind: "graph",
    id: defaultGraphId,
    graphId: defaultGraphId,
  };

  /**
   * Replaces the URL without emitting a route change: the hash must be a
   * hash string.
   *
   * @param {string} hash
   */
  function replaceHash(hash) {
    window.history.replaceState(null, "", hash);
    current = parseRoute(hash) ?? {
      projectId: current.projectId,
      kind: "graph",
      id: current.id ?? current.graphId,
      graphId: current.graphId,
    };
  }

  // A URL that does not parse is normalized to the default route, without
  // polluting history
  if (!parseRoute(window.location.hash)) {
    replaceHash(
      buildScreenHash(current.projectId, {
        kind: "graph",
        id: current.graphId,
      }),
    );
  }

  function handleHashChange() {
    const route = parseRoute(window.location.hash);
    if (!route) return;
    current = route;
    onRouteChange?.(route);
  }

  window.addEventListener("hashchange", handleHashChange);

  return {
    route: () => current,
    graphId: () => current.graphId,
    projectId: () => current.projectId,
    /**
     * @param {string} graphId
     * @param {{ replace?: boolean }} [navOptions]
     */
    /**
     * Navigates to a screen (work document #62): a graph id keeps the
     * legacy shape, a screen descriptor builds the kind route.
     *
     * @param {string | { kind: string, id: string | null }} target A
     *   graph id (string form) or a screen descriptor.
     * @param {{ replace?: boolean }} [navOptions]
     */
    navigate(
      /** @type {string | { kind: string, id: string | null }} */ target,
      /** @type {{ replace?: boolean }} */ navOptions = {},
    ) {
      const screen =
        typeof target === "string" ? { kind: "graph", id: target } : target;
      const hash = buildScreenHash(current.projectId, screen);
      if (hash === window.location.hash) return;
      if (navOptions.replace) {
        replaceHash(hash);
        return;
      }
      // Fires hashchange, which updates the route and notifies the app
      window.location.hash = hash;
    },
    destroy() {
      window.removeEventListener("hashchange", handleHashChange);
    },
  };
}
