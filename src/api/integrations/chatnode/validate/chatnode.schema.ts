import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

const isNotEmpty = (...propertyNames: string[]): JSONSchema7 => {
  const properties = {};
  propertyNames.forEach(
    (property) =>
      (properties[property] = {
        minLength: 1,
        description: `The "${property}" cannot be empty`,
      }),
  );
  return {
    if: {
      propertyNames: {
        enum: [...propertyNames],
      },
    },
    then: { properties },
  };
};

export const chatnodeSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    enabled: { type: 'boolean', enum: [true, false] },
    bot_id: { type: 'string' },
    sign_name: { type: 'string' },
    active_hours: {
      type: 'object',
      properties: {
        0: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ini: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
        1: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ini: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
        2: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ini: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
        3: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ini: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
        4: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ini: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
        5: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ini: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
        6: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ini: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
      },
    },
    numbers_always_active: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['enabled', 'bot_id'],
  ...isNotEmpty('enabled', 'bot_id'),
};
