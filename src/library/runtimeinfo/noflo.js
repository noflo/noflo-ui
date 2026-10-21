/**
 * @file The NoFlo flavor descriptor (work document #66): the single source
 * of truth for how NoFlo software is written, materialized, and documented.
 * One flavor covers NoFlo 2.x — the same components run on Node, browser,
 * and embedded-JS hosts, so there is no platform split here (platform
 * identity belongs to the runtime instance, graph needs to the graph
 * `environment`).
 *
 * The templates are deterministic interpolation functions — no EJS — and
 * receive the declared signature so generated stubs match the ports.
 */

/**
 * The NoFlo 2.x component template: the Process API idiom the migrated
 * libraries use, generating a **working signature-only stub** — the
 * declared ports, a process that consumes what arrives and completes
 * without sending. The component loads and participates in a network as
 * it is; the implementation replaces the marked body (the wire-level twin
 * of the engine's StubComponent, work document #19).
 *
 * @param {any} component The template context (work document #66's
 *   resolver): the declared signature as-is — inports/outports with their
 *   registry fields, description, icon — plus the name in its forms
 *   (full, namespace, shortName, identifier). The identifier is this
 *   template's class-name form; JavaScript's getComponent idiom doesn't
 *   use it, languages with nominal types do.
 * @returns {string}
 */
function javascriptTemplate(component) {
  const name = component.name ?? "Component";
  const description = component.description || "What the component does";
  const icon = component.icon || "gear";
  const inports = component.inports ?? [];
  const outports = component.outports ?? [];
  const portDecl = (/** @type {any} */ port, /** @type {string} */ dir) => {
    const datatype = port.type && port.type !== "all" ? port.type : "all";
    const required =
      dir === "in" && port.required ? ",\n        required: true" : "";
    return `      ${port.name}: {\n        datatype: ${JSON.stringify(datatype)}${required},\n      },`;
  };
  const inBlock = inports.length
    ? inports.map((/** @type {any} */ p) => portDecl(p, "in")).join("\n")
    : "      // No inports declared yet";
  const outBlock = outports.length
    ? outports.map((/** @type {any} */ p) => portDecl(p, "out")).join("\n")
    : "      // No outports declared yet";
  const inportNames = inports.map((/** @type {any} */ p) => p.name);
  const consume =
    inportNames.length > 0
      ? `    // The signature-only stub: consume what arrives, complete without\n    // sending — the implementation replaces this body\n    for (const port of ${JSON.stringify(inportNames)}) {\n      if (input.hasData(port)) {\n        input.getData(port);\n      }\n    }\n    output.done();`
      : "    output.done();";

  return `import { Component } from "@noflo/noflo";

/**
 * ${description}
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const c = new Component({
    description: ${JSON.stringify(description)},
    icon: ${JSON.stringify(icon)},
    inPorts: {
${inBlock}
    },
    outPorts: {
${outBlock}
    },
  });

  c.process((input, output) => {
${consume}
  });

  return c;
}
`;
}

/** The NoFlo flavor descriptor (work document #66). */
export const nofloFlavor = {
  id: "noflo",
  shortname: "NoFlo",
  icon: "cloud",
  description: "Build network applications",
  helpurl: "https://github.com/noflo/noflo-nodejs#readme",
  languages: [
    { id: "javascript", label: "JavaScript", ext: "js" },
    { id: "typescript", label: "TypeScript", ext: "ts" },
  ],
  preferredLanguage: "javascript",
  templates: {
    javascript: javascriptTemplate,
    // The TypeScript scaffold shares the Process API idiom — JS is valid
    // TS — and the language drives the editor's dialect and the
    // materialized extension
    typescript: javascriptTemplate,
  },
  materialization: {
    manifest: "package.json",
    dependencies: { "@noflo/noflo": "^2.0.0-alpha.12" },
    graphFormat: "graph-json",
    testDir: "specs/",
    testScript: "fbp-spec specs/",
    componentCodeExt: "js",
  },
  docs: [],
  examples: {},
};
