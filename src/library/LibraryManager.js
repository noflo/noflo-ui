import { graph } from "noflo";
import { ComponentSignature } from "./schema.js";

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

    this.dispatchEvent(new CustomEvent("component-changed", {
      detail: { compName, definition },
    }));
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
    if (moduleMap && moduleMap.delete(component)) {
      this.dispatchEvent(new CustomEvent("component-changed", {
        detail: { compName },
      }));
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
   * @param {FileSystemDirectoryHandle} directoryHandle
   */
  async loadLibrary(directoryHandle) {
    this.modules.clear();
    this.modules.set(LibraryManager.PROJECT_MODULE, new Map());

    let libraryFileHandle = null;
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === "file" && entry.name === "fbp.library.json") {
        libraryFileHandle = entry;
        break;
      }
    }

    if (libraryFileHandle) {
      console.log("Loading library from fbp.library.json");
      const file = await libraryFileHandle.getFile();
      const text = await file.text();
      const json = JSON.parse(text);
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
        this.modules.set(moduleName, moduleMap);
      }
    } else {
      console.log(
        "No fbp.library.json found. Inferring library from graph files.",
      );
      await this.inferLibraryFromFolder(directoryHandle);
    }
  }

  /**
   * @param {FileSystemDirectoryHandle} directoryHandle
   */
  async inferLibraryFromFolder(directoryHandle) {
    for await (const entry of directoryHandle.values()) {
      if (entry.kind !== "file") {
        continue;
      }
      const file = await entry.getFile();
      const text = await file.text();
      let g = null;

      if (entry.name.endsWith(".json")) {
        try {
          const json = JSON.parse(text);
          g = await graph.loadJSON(json);
          if (!g.name) {
            g.name = entry.name.split(".")[0];
          }
        } catch (e) {
          console.warn("Failed to parse graph file:", entry.name, e);
        }
      } else if (entry.name.endsWith(".fbp")) {
        try {
          g = await graph.loadFBP(text);
          if (!g.name) {
            g.name = entry.name.split(".")[0];
          }
        } catch (e) {
          // console.warn("Failed to parse FBP language graph file:", entry.name, e);
        }
      }

      if (g) {
        this.inferLibraryFromGraph(g);
      }
    }
  }

  /**
   * @param {any} g
   */
  inferLibraryFromGraph(g) {
    const isMain = g.properties && g.properties.main;

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

  /**
   * @param {FileSystemDirectoryHandle} directoryHandle
   */
  async saveLibrary(directoryHandle) {
    if (!directoryHandle) return;
    console.log("Saving library...");
    try {
      const modules = [];
      for (const [moduleName, moduleMap] of this.modules) {
        const components = Array.from(moduleMap.values());
        if (components.length > 0) {
          modules.push({
            name: moduleName,
            components: components.map(comp => ({
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
      const json = JSON.stringify({ modules }, null, 2);

      const fileHandle = await directoryHandle.getFileHandle("fbp.library.json", {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      console.log("Library saved successfully.");
    } catch (err) {
      console.error("Error saving library:", err);
    }
  }
}
