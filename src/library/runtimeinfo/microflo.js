/**
 * @file The MicroFlo flavor descriptor (work document #66, Phase 2): the
 * abstraction proof — a second implementation family where nothing in the
 * consumers changes, only the data differs. MicroFlo is flow-based
 * programming for microcontrollers: components are C++ classes declared
 * with `microflo_component yaml` comment blocks (declarec extraction),
 * found by directory scan, and generated onto a target (Arduino, ESP8266,
 * embedded Linux, mbed) with `microflo generate`.
 *
 * The template is grounded in MicroFlo 0.6.x's actual component format:
 * the generated stub declares the ports in the scanner's own vocabulary
 * and implements the `process(Packet, PortId)` idiom — a working
 * signature-only stub whose marked body the implementation replaces.
 */

/**
 * The declarec yaml block's port entries, from the declared signature
 * AS-IS — the registry's shape passes to the template untouched. MicroFlo
 * ports default to type `all`, so the coarse datatypes render verbatim.
 *
 * @param {any[]} ports
 * @param {string} key The block's section name ("inports"/"outports").
 * @returns {string}
 */
function portBlock(ports, key) {
  if (!ports || ports.length === 0) return `${key}: {}`;
  const entries = ports
    .map((/** @type {any} */ port) => {
      const type = port.type && String(port.type) !== "" ? port.type : "all";
      return `  ${port.name}:\n    type: ${type}`;
    })
    .join("\n");
  return `${key}:\n${entries}`;
}

/**
 * The MicroFlo C++ component template (work document #66): the declarec
 * declaration plus the class idiom. The base class follows the outport
 * count — `SingleOutputComponent` for one (the scanner idiom's
 * convenience base), `Component` with an allocated connection array for
 * several, the bare `Component(0, 0)` for none.
 *
 * @param {any} component The template context: the declared signature
 *   as-is plus the name in its forms (the identifier is this template's
 *   class-name form).
 * @returns {string}
 */
function cppTemplate(component) {
  const className = component.identifier ?? "Component";
  const description = component.description || "What the component does";
  const inports = component.inports ?? [];
  const outports = component.outports ?? [];

  const base = outports.length === 1 ? "SingleOutputComponent" : "Component";
  // SingleOutputComponent's default constructor suffices; the bare and
  // multi-output forms configure the base explicitly (the DummyComponent
  // and PureFunctionComponent2 patterns in microflo.h)
  const ctor =
    outports.length === 0
      ? `    ${className}() : Component(0, 0) {}\n`
      : outports.length > 1
        ? `    ${className}() : Component(connections, ${outports.length}) {}\n`
        : "";
  const connectionsField =
    outports.length > 1
      ? `\nprivate:\n    Connection connections[${outports.length}];\n`
      : "";

  return `/* microflo_component yaml
name: ${className}
description: ${JSON.stringify(String(description))}
${portBlock(inports, "inports")}
${portBlock(outports, "outports")}
microflo_component */
//
// ${description}
// The signature-only stub: consume what arrives, complete without
// sending — the implementation replaces the marked body.
//
class ${className} : public ${base} {
public:
${ctor}    // Implements Component
    virtual void process(Packet in, MicroFlo::PortId port) {
        if (!in.isData()) {
            return;
        }
        // The implementation replaces this body
    }
${connectionsField}};
`;
}

/**
 * @typedef {import("./noflo.js").FlavorDoc} FlavorDoc
 */

/** The MicroFlo flavor's bundled documentation (work document #66). */
const microfloDocs = /** @type {FlavorDoc[]} */ ([
  {
    id: "writing-microflo-components",
    title: "Writing MicroFlo components",
    category: "authoring",
    markdown: `A MicroFlo component is a C++ class: packets arrive as \`Packet\` values on
inports, the component's \`process\` method decides what to do, and results
leave with \`send()\`. Components are C++03 — no exceptions, no stdlib —
so they build on the smallest targets.

## The declaration

The component scanner reads the \`microflo_component yaml\` comment block
(the declarec convention) above the class. The block declares the name,
description, and ports; the class below implements the behavior:

\`\`\`
/* microflo_component yaml
name: Parse
description: "Turns a byte into a boolean"
inports:
  in:
    type: byte
outports:
  out:
    type: boolean
microflo_component */
class Parse : public SingleOutputComponent {
public:
    virtual void process(Packet in, MicroFlo::PortId port) {
        if (!in.isData()) return;
        send(Packet(in.asByte() != 0));
    }
};
\`\`\`

"Implement in code" generates this exact form from the component's
declared signature: the ports render in the block, the class extends the
right base, and the marked body waits for the implementation.

## Ports and packets

Ports are declared per name in the yaml block; a port without an
explicit type is \`all\`. The \`process\` method runs per arriving packet —
the \`port\` argument names which inport fired. Packets carry the wire's
value types (boolean, byte, integer, float); \`in.isData()\` guards
against lifecycle packets, the \`as*()\` accessors read the value, and
\`send(Packet, port)\` emits on an outport. A component with exactly one
outport extends \`SingleOutputComponent\` (the base allocates the
connection); more take \`Component\` with their own connection array.

## Where components live

Component files are \`.hpp\` (or \`.cpp\`) files in the project's
\`components/\` directory — the scanner discovers them by directory scan,
no manifest to register. The generated stub materializes as
\`components/<name>.hpp\`, which is exactly where the toolchain looks.
`,
  },
  {
    id: "getting-a-microflo-runtime",
    title: "Getting a MicroFlo runtime",
    category: "deployment",
    markdown: `A MicroFlo runtime runs standalone on the microcontroller: the graph
lives on the device, and the runtime can be introspected and
reconfigured live over the connection — no host round-trip per packet.

## Generate and flash

The \`microflo\` CLI compiles a graph and its components into a target
build:

\`\`\`
npm install -g microflo
microflo generate graphs/main.fbp build/main --target arduino --components components/
\`\`\`

Targets include Arduino, ESP8266, embedded Linux, and mbed-class ARM
boards. The generated build flashes with the target's own toolchain —
the Arduino IDE or \`arduino-cli\` for AVR-class boards, the board
vendor's tooling otherwise. From then on the device IS the runtime: it
announces its graph, accepts live reconfiguration, and keeps running
standalone.

## The project's graphs

Graphs materialize from the project as \`graphs/<name>.graph.json\` —
MicroFlo consumes the JSON graph form directly (the \`.fbp\` DSL and the
JSON definition are interchangeable upstream).

## Testing on the device

MicroFlo supports automated testing against the running device — the
runtime protocol drives the same introspection the editor's runtime
corner uses. Constrained devices degrade the wire gracefully: the
advertised capability mask narrows what the editor offers, and sparse
telemetry is the constrained case working as designed.
`,
  },
]);

/** The MicroFlo flavor descriptor (work document #66, Phase 2). */
export const microfloFlavor = {
  id: "microflo",
  shortname: "MicroFlo",
  icon: "microchip",
  description: "Flow-based programming for microcontrollers",
  helpurl: "https://github.com/microflo/microflo#readme",
  languages: [{ id: "cpp", label: "C++", ext: "hpp" }],
  preferredLanguage: "cpp",
  templates: {
    cpp: cppTemplate,
  },
  materialization: {
    // Components are found by directory scan — no package manifest to
    // register (work document #66's second-family proof)
    manifest: null,
    dependencies: {},
    graphFormat: "graph-json",
    testDir: null,
    testScript: null,
    componentCodeExt: "hpp",
  },
  docs: microfloDocs,
  examples: {},
};
