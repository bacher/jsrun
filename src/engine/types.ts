import type { AstFunctionStatementNode } from '../parser/parser';

export enum ValueType {
  BOOLEAN = 'BOOLEAN',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  OBJECT = 'OBJECT',
  FUNCTION = 'FUNCTION',
  UNDEFINED = 'UNDEFINED',
}

export enum FunctionRealization {
  NATIVE = 1,
  JAVASCRIPT,
}

export type NativeFunction = (...args: unknown[]) => unknown;

export type Value =
  | {
      type: ValueType.BOOLEAN;
      value: boolean;
    }
  | {
      type: ValueType.NUMBER;
      value: number;
    }
  | {
      type: ValueType.STRING;
      value: string;
    }
  | {
      type: ValueType.OBJECT;
      fields: Map<string, FieldDeclaration>;
    }
  | {
      type: ValueType.UNDEFINED;
    }
  | {
      type: ValueType.FUNCTION;
      realization: FunctionRealization.NATIVE;
      call: NativeFunction;
    }
  | {
      type: ValueType.FUNCTION;
      realization: FunctionRealization.JAVASCRIPT;
      declaration: AstFunctionStatementNode;
    };

export type FieldDeclaration = {
  value: Value;
  enumerable: boolean;
};

export type ProgramState = {
  globalVariables: Map<string, Value>;
};

export type CallstackEntry = unknown;

export type Scope = {
  callstack: CallstackEntry[];
};
