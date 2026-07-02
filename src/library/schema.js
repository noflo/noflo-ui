export const PortSignature = {
  title: 'Port definition',
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      name: 'Name',
      type: 'string',
      description: 'Port name',
      example: 'in',
    },
    description: {
      name: 'Description',
      type: 'string',
      description: 'Longer textual description of the port',
      example: 'Input YAML to be converted',
    },
    type: {
      name: 'Type',
      type: 'string',
      description: 'Port datatype',
      example: 'string',
    },
    addressable: {
      name: 'Addressable',
      type: 'boolean',
      description: 'Whether the port is an addressable ArrayPort',
      example: false,
    },
  },
};

export const ComponentSignature = {
  title: 'Component signature',
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      description: 'Component name',
    },
    icon: {
      type: 'string',
      title: 'Icon',
      description: 'Default icon used to depict the component',
      default: 'gear',
      format: 'fontawesome',
    },
    description: {
      type: 'string',
      title: 'Description',
      description: 'Longer textual description of the component',
    },
    inports: {
      type: 'array',
      description: 'Definition of component inports',
      minItems: 0,
      uniqueItems: true,
      items: PortSignature,
    },
    outports: {
      type: 'array',
      description: 'Definition of component outports',
      minItems: 0,
      uniqueItems: true,
      items: PortSignature,
    },
  },
};
