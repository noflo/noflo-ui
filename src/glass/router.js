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

/** @typedef {{ projectId: string, graphId: string }} GlassRoute */

/**
 * @param {string | null | undefined} hash
 * @returns {GlassRoute | null}
 */
export function parseRoute(hash) {
  if (typeof hash !== "string") return null;
  const match = /^#\/p\/([^/]+)\/(.+)$/.exec(hash);
  if (!match) return null;
  return {
    projectId: decodeURIComponent(match[1]),
    graphId: decodeURIComponent(match[2]),
  };
}

/**
 * @param {string} projectId
 * @param {string} graphId
 * @returns {string}
 */
export function buildHash(projectId, graphId) {
  const project = encodeURIComponent(projectId);
  const graph = graphId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `#/p/${project}/${graph}`;
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
 *   navigate: (graphId: string, options?: { replace?: boolean }) => void,
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
    graphId: defaultGraphId,
  };

  /**
   * @param {GlassRoute} route
   */
  function replaceHash(route) {
    window.history.replaceState(
      null,
      "",
      buildHash(route.projectId, route.graphId),
    );
  }

  // A URL that does not parse is normalized to the default route, without
  // polluting history
  if (!parseRoute(window.location.hash)) {
    replaceHash(current);
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
    navigate(graphId, navOptions = {}) {
      const hash = buildHash(current.projectId, graphId);
      if (hash === window.location.hash) return;
      if (navOptions.replace) {
        replaceHash({ projectId: current.projectId, graphId });
        current = { projectId: current.projectId, graphId };
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
