/**
 * @file The spec suite's YAML serialization (work document #43): the
 * structural test model renders as fbp-spec YAML — the interchange form
 * the `test` script's runner consumes. The CRDT is the source of truth
 * (work document #16: YAML is export/interchange only); the rendering is
 * deterministic per suite so the canonical round-trip holds.
 *
 * The environment-agnostic shape: values serialize without a YAML parser —
 * plain scalars render bare, everything else through JSON's flow style,
 * which is valid YAML. The reverse direction (file → CRDT) parses YAML and
 * belongs to the materializer's reverse-path work.
 */

/**
 * Renders one value as a YAML scalar/flow value: strings that need no
 * quoting stay bare; everything else rides JSON's flow style, which YAML
 * parses (flow mappings, sequences, quoted strings, numbers, booleans,
 * null).
 *
 * @param {any} value
 * @returns {string}
 */
export function yamlValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") {
    // Bare when unambiguous YAML: no leading specials, no flow
    // punctuation, no query/anchor characters, never a bare bool/null word
    if (
      value.length > 0 &&
      !/^[!&*[\]{}|>%@`"'\s#,]/.test(value) &&
      !/[\s#,]$/.test(value) &&
      !/[:\s]/.test(value) &&
      !/^(true|false|null|yes|no|on|off|~)$/i.test(value) &&
      !/^-/.test(value) &&
      isNaN(Number(value))
    ) {
      return value;
    }
    return JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Renders one port→payload mapping block (the inputs/expect objects):
 * each entry as `key: value`, in the structural array's order — the CRDT's
 * order is the file's order.
 *
 * @param {Array<{ port: string, payload: any }>} entries
 * @param {string} indent The block's indentation.
 * @returns {string[]} Lines, without a trailing newline.
 */
function mappingBlock(entries, indent) {
  return entries.map(
    (entry) => `${indent}${entry.port}: ${yamlValue(entry.payload)}`,
  );
}

/**
 * Renders one test case as a YAML sequence entry.
 *
 * @param {{ name: string, inputs?: Array<{ port: string, payload: any }>, expects?: Array<{ port: string, payload: any, assertion?: string }> }} specCase
 * @returns {string[]}
 */
function caseLines(specCase) {
  const lines = [`  - name: ${yamlValue(specCase.name)}`];
  const inputs = specCase.inputs ?? [];
  if (inputs.length > 0) {
    lines.push(`    inputs:`);
    lines.push(...mappingBlock(inputs, "      "));
  }
  const expects = specCase.expects ?? [];
  // fbp-spec's assertion is case-level with the expect carrying the value:
  // a single expect's operator renders as the case's assertion type, the
  // default stays equals. The CRDT's per-expect model remains the truth —
  // multi-expect operator mixes are an editor concern.
  if (expects.length === 1 && expects[0].assertion) {
    lines.push(`    assertion:`);
    lines.push(`      type: ${yamlValue(expects[0].assertion)}`);
  }
  if (expects.length > 0) {
    lines.push(`    expect:`);
    lines.push(...mappingBlock(expects, "      "));
  }
  return lines;
}

/**
 * Renders one spec suite as its fbp-spec YAML file content.
 *
 * @param {any} suite The suite record — the CRDT form (a Y.Map, read
 *   through its projection) or an already-plain shape.
 * @param {{ isGraph?: boolean }} [options] Whether the topic is a project
 *   graph (fbp-spec targets graphs with `graph:`, components with
 *   `component:`).
 * @returns {string}
 */
export function specSuiteToYaml(suite, options = {}) {
  // Accepts the record as either a Y.Map (the CRDT form) or its plain
  // projection — the rendering reads fields the same way either way
  const plain = suite.toJSON?.() ?? suite;
  const topic = String(plain.topic ?? "");
  const cases = Array.from(plain.cases ?? []);
  const lines = [`name: ${yamlValue(topic)}`];
  lines.push(`${options.isGraph ? "graph" : "component"}: ${yamlValue(topic)}`);
  if (cases.length === 0) {
    lines.push("cases: []");
  } else {
    lines.push("cases:");
    for (const specCase of cases) {
      lines.push(...caseLines(specCase));
    }
  }
  return `${lines.join("\n")}\n`;
}
