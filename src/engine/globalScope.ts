import {
  FieldDeclaration,
  FunctionRealization,
  Value,
  ValueType,
} from './types';

export const globalScope: [string, Value][] = [
  [
    'console',
    {
      type: ValueType.OBJECT,
      fields: new Map<string, FieldDeclaration>([
        [
          'log',
          {
            value: {
              type: ValueType.FUNCTION,
              realization: FunctionRealization.NATIVE,
              call: (...args) => {
                console.log(...args);
              },
            },
            enumerable: false,
          },
        ],
      ]),
    },
  ],
];
