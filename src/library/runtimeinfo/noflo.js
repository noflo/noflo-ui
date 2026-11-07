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

/**
 * @typedef {Object} FlavorDoc
 * @property {string} id Stable document id (the route id and the
 *   materialized file name).
 * @property {string} title Display title.
 * @property {"authoring" | "deployment"} category
 *   authoring — how to write components for this runtime; deployment —
 *   how to get a runtime and deploy a project onto it (work document #66).
 * @property {string} markdown The bundled document body.
 */

/**
 * The NoFlo flavor's bundled documentation (work document #66): the
 * authoring and deployment guides, first-party text bundled with the app
 * so off-grid readers get the same truth the templates and the
 * materializer carry. `helpurl` stays a supplement for online readers —
 * never the primary carrier.
 *
 * @type {FlavorDoc[]}
 */
const nofloDocs = [
  {
    id: "writing-components",
    title: "Writing NoFlo components",
    category: "authoring",
    markdown: `A NoFlo component is a function from inports to outports: packets
arrive on inports, the component's process function decides when to act,
and results leave as packets on outports. The graph wires components into
networks; the component itself never knows its neighbors.

## The shape

A component module is an ES module with one named export, \`getComponent\`,
returning the configured component:


    import { Component } from "@noflo/noflo";

    export function getComponent() {
      const c = new Component({
        description: "Splits a string into words",
        icon: "filter",
        inPorts: {
          in: { datatype: "string" },
        },
        outPorts: {
          out: { datatype: "string" },
        },
      });

      c.process((input, output) => {
        if (!input.hasData("in")) return;
        const text = input.getData("in");
        for (const word of text.split(/\\s+/)) {
          output.send({ out: word });
        }
        output.done();
      });

      return c;
    }

## Ports

Declare every port the component speaks on. The datatype is the coarse
type contract (\`string\`, \`number\`, \`boolean\`, \`object\`, \`array\`,
\`all\` for anything); the editor's wiring guidance and the component
picker both read it. A port may be \`required: true\` (the network waits
for it before firing) and \`addressable: true\` (an array port — callers
target a specific index).

The signature declared here is the component's public interface: the
canvas renders ports from it, the type checking uses it, and the
materialized \`components/<name>.json\` pins it. Keep the signature and
the process body in agreement.

## The process function

The \`process\` callback runs when input is available. Check
\`input.hasData(port)\` before reading; return without acting when a
needed port has nothing yet — the runtime calls again when it does. Send
with \`output.send({ port: value })\` (repeatable, in order), and always
finish with \`output.done()\` — the network's completion bookkeeping
depends on it. Errors go to \`output.error(err)\`, never thrown.

## Starting out

"Implement in code" on a component generates this exact idiom with your
declared ports as a working stub: it consumes what arrives and completes
without sending. The component loads and participates in a network as it
is — replace the marked body with the implementation when you are ready.

\`helpurl\` supplement: the NoFlo documentation at
https://noflojs.org/docs/ covers the Process API in depth.
`,
  },
  {
    id: "getting-a-runtime",
    title: "Getting a runtime",
    category: "deployment",
    markdown: `A runtime executes a project's graphs: it joins the mesh as an FBP
Protocol 2.0 participant, announces itself when it starts, and evaluates
the project's Dacar grants like any other replica. The Runtime corner
lists every runtime it hears; connect to one to deploy the active graph,
run it, and observe its processes.

## The Companion's on-demand runtime

A Companion hosting this project can start a runtime for it: one
sandboxed Node.js subprocess per project, carrying the project's own
identity and its Dacar binding. It announces on the mesh under the
\`fbp.runtime\` aspect and appears in the Runtime corner like any other
runtime. This is the intended path for projects with a Companion
participant — no extra install, the trust bootstrap is automatic.

## A standalone NoFlo runtime

Any mesh device can run a standalone NoFlo runtime:


    npm install -g @noflo/nodejs
    noflo-nodejs --mesh --name "workshop"

Grant it in the sync panel's wallet like any collaborator — the runtime
is another replica, and its capabilities are the roles you grant it.

## The browser runtime

Projects whose components run in the browser can execute on the in-browser
runtime — no separate process at all. Deployment stays flavor-specific:
firmware targets (MicroFlo and friends) follow the same Runtime corner
flow, with the advertised capability mask degrading the affordances the
corner offers (observe-only runtimes show process counts without run
controls).

## After connect

Connect resolves the runtime's advertised capabilities. Deploy sends the
active graph as graph operations — entity ids carry over, so a redeploy
converges onto the same network instead of duplicating it. Run starts the
network; the process listing and run state observe it live. Each run
records a flowtrace with the project.
`,
  },
];

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
  docs: nofloDocs,
  examples: {},
};
