import * as Y from "../../vendor/yjs.js";
import { emit } from "../events.js";

/**
 * @typedef {"subgraph" | "elementary" | "stub" | "inferred"} ComponentType
 */

/**
 * @typedef {import("./schema.js").PortSignature} PortSignature
 *
 * @typedef {Object} ComponentDefinition
 * @property {string} name
 * @property {string} [module]
 * @property {string} [icon]
 * @property {string} [description]
 * @property {PortSignature[]} inports
 * @property {PortSignature[]} outports
 * @property {ComponentType} type
 * @property {any} [configSchema] The component's config-schema
 *   composition (work document #44's catalogs): the node inspector
 *   renders editors from it with the declared defaults prefilled.
 *   Populated when the runtime's component details advertise it.
 */

/**
 * LibraryManager keeps track of the component library.
 * It resolves both "project local" components without a namespace (e.g., "MyComponent")
 * and library components with a namespace (e.g., "module/MyComponent").
 *
 * @extends EventTarget
 */
export class LibraryManager extends EventTarget {
  /** @type {string} */
  static PROJECT_MODULE = "project";

  constructor() {
    super();
    /** @type {Map<string, Map<string, ComponentDefinition>>} */
    this.modules = new Map();
    this.modules.set(LibraryManager.PROJECT_MODULE, new Map());
  }

  /**
   * Lists every component name in the library, qualified for modules other
   * than the project's own (work document #29: the candidate list of the
   * typed-port guiding).
   *
   * @returns {string[]}
   */
  listComponents() {
    const names = [];
    for (const [module, map] of this.modules.entries()) {
      for (const component of map.keys()) {
        names.push(
          module === LibraryManager.PROJECT_MODULE
            ? component
            : `${module}/${component}`,
        );
      }
    }
    return names.sort();
  }

  /**
   * @param {string} compName
   * @returns {ComponentDefinition | undefined}
   */
  getComponent(compName) {
    let [module, component] = compName.split("/");
    if (!component) {
      component = module;
      module = LibraryManager.PROJECT_MODULE;
    }

    const moduleMap = this.modules.get(module);
    if (!moduleMap) return undefined;
    return moduleMap.get(component);
  }

  /**
   * @param {string} compName
   * @param {ComponentDefinition} definition
   */
  setComponent(compName, definition) {
    let [module, component] = compName.split("/");
    if (!component) {
      component = module;
      module = LibraryManager.PROJECT_MODULE;
    }

    let moduleMap = this.modules.get(module);
    if (!moduleMap) {
      moduleMap = new Map();
      this.modules.set(module, moduleMap);
    }

    definition.name = component;
    definition.module = module;
    moduleMap.set(component, definition);

    emit(
      this,
      "component-changed",
      { compName, definition },
      { bubbles: false, composed: false },
    );
  }

  /**
   * @param {string} compName
   */
  removeComponent(compName) {
    let [module, component] = compName.split("/");
    if (!component) {
      component = module;
      module = LibraryManager.PROJECT_MODULE;
    }

    const moduleMap = this.modules.get(module);
    if (moduleMap?.delete(component)) {
      emit(
        this,
        "component-changed",
        { compName },
        { bubbles: false, composed: false },
      );
    }
  }

  /**
   * @param {string} compName
   * @param {ComponentType} type
   * @returns {ComponentDefinition}
   */
  addComponent(compName, type = "stub") {
    let [module, component] = compName.split("/");
    if (!component) {
      component = module;
      module = LibraryManager.PROJECT_MODULE;
    }

    let comp = this.getComponent(compName);
    if (!comp) {
      comp = {
        name: component,
        module,
        icon: "gear",
        inports: [],
        outports: [],
        type,
      };
      this.setComponent(compName, comp);
    }
    return comp;
  }

  /**
   * @param {string} compName
   * @param {string} portName
   * @param {"in" | "out"} direction
   */
  addPort(compName, portName, direction) {
    const comp = this.addComponent(compName, "inferred");

    const ports = direction === "in" ? comp.inports : comp.outports;
    if (ports.some((p) => p.name === portName)) {
      return;
    }

    ports.push({ name: portName, addressable: false, type: "all" });
    this.setComponent(compName, comp);
  }

  /**
   * @returns {Object}
   */
  toJSON() {
    const modules = [];
    for (const [moduleName, moduleMap] of this.modules) {
      const components = Array.from(moduleMap.values());
      if (components.length > 0) {
        modules.push({
          name: moduleName,
          components: components.map((comp) => ({
            name: comp.name,
            icon: comp.icon,
            description: comp.description,
            inports: comp.inports,
            outports: comp.outports,
            type: comp.type,
          })),
        });
      }
    }
    return { modules };
  }

  /**
   * @param {{ modules: Array<{ name?: string, components: Array<any> }> }} json
   * @returns {LibraryManager}
   */
  static fromJSON(json) {
    const manager = new LibraryManager();
    // json format: { modules: [ { name: "modName", components: [...] } ] }
    for (const moduleEntry of json.modules) {
      const moduleName = moduleEntry.name || LibraryManager.PROJECT_MODULE;
      const moduleMap = new Map();
      for (const comp of moduleEntry.components) {
        const definition = {
          icon: "gear",
          ...comp,
          module: moduleName,
        };
        // If comp.name is "module/Comp", we should handle it,
        // but the JSON format seems to be per-module.
        // Let's assume comp.name is the component name within the module.
        moduleMap.set(comp.name, definition);
      }
      manager.modules.set(moduleName, moduleMap);
    }
    return manager;
  }

  /**
   * @param {any} g
   */
  inferLibraryFromGraph(g) {
    const isMain = g.properties?.main;

    if (!isMain) {
      // Graph itself is usable as subgraph, add to library
      const comp = this.addComponent(g.name, "subgraph");
      comp.icon = g.properties?.icon || "tree";
      for (const inportName in g.inports) {
        this.addPort(g.name, inportName, "in");
      }
      for (const outportName in g.outports) {
        this.addPort(g.name, outportName, "out");
      }
    }

    // Infer more components from nodes
    const nodeToType = new Map();
    for (const nodeId in g.nodes) {
      const node = g.nodes[nodeId];
      nodeToType.set(node.id, node.component);
    }

    for (const conn of g.edges) {
      const fromType = nodeToType.get(conn.from.node);
      if (fromType) {
        this.addPort(fromType, conn.from.port, "out");
      }
      const toType = nodeToType.get(conn.to.node);
      if (toType) {
        this.addPort(toType, conn.to.port, "in");
      }
    }

    for (const iip of g.initializers) {
      const toType = nodeToType.get(iip.to.node);
      if (toType) {
        this.addPort(toType, iip.to.port, "in");
      }
    }
  }
}

/**
 * Reconciles the manager's project module from the CRDT registry (work
 * document #29's side view, and the canvas ladder generally): the
 * Glass-side library is the registry's mirror, so signature edits —
 * granular, streaming from the collaborative form — propagate to every
 * FlowNode rendering the component. Idempotent; stale project entries
 * are removed, library modules are untouched.
 *
 * @param {LibraryManager} manager The Glass-side library.
 * @param {Y.Map<any>} registry The CRDT registry map.
 * @param {Y.Doc} doc The project document (subgraph detection reads the
 *   graphs map).
 */
export function syncLibraryFromRegistry(manager, registry, doc) {
  const project = manager.modules.get(LibraryManager.PROJECT_MODULE);
  if (!project) return;
  const seen = new Set();
  for (const [name, entry] of registry.entries()) {
    seen.add(name);
    const plain = entry.toJSON();
    const isSubgraph = doc.getMap("graphs").has(name);
    manager.setComponent(name, {
      name,
      type: isSubgraph ? "subgraph" : "stub",
      icon: plain.icon || "gear",
      description: plain.description,
      inports: (plain.inports ?? []).map((/** @type {any} */ p) => ({
        name: p.name,
        type: p.type ?? "all",
        addressable: Boolean(p.addressable),
      })),
      outports: (plain.outports ?? []).map((/** @type {any} */ p) => ({
        name: p.name,
        type: p.type ?? "all",
        addressable: Boolean(p.addressable),
      })),
    });
  }
  for (const name of [...project.keys()]) {
    if (!seen.has(name)) manager.removeComponent(name);
  }
}
