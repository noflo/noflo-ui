import icons from "../../vendor/fontawesome-icons.js";

export const PortSignature = {
  title: "Port definition",
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: {
      name: "Name",
      type: "string",
      description: "Port name",
      example: "in",
    },
    description: {
      name: "Description",
      type: "string",
      description: "Longer textual description of the port",
      example: "Input YAML to be converted",
    },
    type: {
      name: "Type",
      type: "string",
      description: "Port datatype",
      example: "string",
      default: "all",
      enum: [
        "all",
        "string",
        "number",
        "int",
        "object",
        "array",
        "boolean",
        "color",
        "date",
        "bang",
        "function",
        "buffer",
        "stream",
      ],
    },
    addressable: {
      name: "Addressable",
      type: "boolean",
      description: "Whether the port is an addressable ArrayPort",
      example: false,
      default: false,
    },
  },
};

/**
 * Builds the signature form with per-port schema pickers (work document
 * #57): each port gains a `schema` select over the project's schemas —
 * defaulting to none — with the empty string meaning "no schema
 * declared". The options are built at open time from the project's
 * schemas map; the digest pins bytes at save (the Glass computes it from
 * the CRDT record).
 *
 * @param {string[]} schemaNames The project's schema identifiers.
 * @returns {any}
 */
export function buildSignatureSchema(schemaNames = []) {
  const portSchema = /** @type {any} */ (structuredClone(PortSignature));
  portSchema.properties.schema = {
    name: "Schema",
    type: "string",
    description:
      "Schema artifact refining the port's datatype (the ns/name project schema)",
    default: "",
    enum: ["", ...schemaNames],
  };
  const signature = /** @type {any} */ (structuredClone(ComponentSignature));
  signature.properties.inports.items = portSchema;
  signature.properties.outports.items = portSchema;
  return signature;
}

export const ComponentSignature = {
  title: "Component signature",
  type: "object",
  additionalProperties: false,
  required: ["name", "inports", "outports"],
  properties: {
    name: {
      type: "string",
      title: "Name",
      description: "Component name",
    },
    icon: {
      type: "string",
      title: "Icon",
      description: "Default icon used to depict the component",
      default: "gear",
      enum: Object.keys(icons()),
    },
    description: {
      type: "string",
      title: "Description",
      description: "Longer textual description of the component",
      format: "textarea",
    },
    inports: {
      type: "array",
      uniquePortNames: true,
      description: "Definition of component inports",
      minItems: 0,
      uniqueItems: true,
      items: PortSignature,
    },
    outports: {
      type: "array",
      uniquePortNames: true,
      description: "Definition of component outports",
      minItems: 0,
      uniqueItems: true,
      items: PortSignature,
    },
    type: {
      type: "string",
      title: "Type",
      description: "Component type",
      default: "stub",
      enum: ["subgraph", "elementary", "stub", "inferred"],
    },
  },
};

export const GraphProperties = {
  title: "Graph properties",
  type: "object",
  additionalProperties: true,
  properties: {
    description: {
      name: "Description",
      type: "string",
      description: "Longer textual description of the graph",
      format: "textarea",
    },
    icon: {
      type: "string",
      title: "Icon",
      description:
        "Default icon used to depict the graph when used as a subgraph",
      default: "gear",
      format: "fontawesome",
    },
    main: {
      type: "boolean",
      title: "Main graph",
      description:
        "Main graphs are not intended to be used as subgraphs elsewhere",
      default: false,
    },
    environment: {
      title: "Graph runtime environment information",
      type: "object",
      properties: {
        type: {
          name: "Type",
          type: "string",
          title: "Runtime type",
          example: "noflo",
        },
        content: {
          name: "Content",
          type: "string",
          description:
            "Content to be passed to the runtime environment (for example a HTML fixture for browser graphs)",
          format: "textarea",
        },
      },
    },
  },
};

export const NodeMetadata = {
  title: "Node metadata",
  type: "object",
  additionalProperties: true,
  properties: {
    label: {
      name: "Label",
      type: "string",
      description: "Node display name",
    },
  },
};

export const EdgeMetadata = {
  title: "Graph metadata",
  type: "object",
  additionalProperties: true,
  properties: {
    label: {
      name: "Label",
      type: "string",
      description: "Node display name",
    },
  },
};
