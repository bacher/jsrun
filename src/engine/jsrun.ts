import {
  AstExpressionNode,
  AstNodeType,
  AstSourceFileNode,
  AstStatementNode,
  FieldNameNode,
} from '../parser/parser';
import {
  FunctionRealization,
  ProgramState,
  Scope,
  Value,
  ValueType,
} from './types';
import { globalScope } from './globalScope';

export function runSourceFile(fileNode: AstSourceFileNode): void {
  const state: ProgramState = {
    globalVariables: new Map(globalScope),
  };

  executeStatements(
    state,
    {
      callstack: [],
    },
    fileNode.statements,
  );

  console.log('State:');
  console.log('Global Variables:', state.globalVariables);
}

function executeStatements(
  state: ProgramState,
  scope: Scope,
  statements: AstStatementNode[],
) {
  for (const statement of statements) {
    executeStatement(state, scope, statement);
  }
}

function executeStatement(
  state: ProgramState,
  scope: Scope,
  statement: AstStatementNode,
) {
  const { body } = statement;

  switch (body.type) {
    case AstNodeType.DEFINE_VARIABLE: {
      let value: Value = {
        type: ValueType.UNDEFINED,
      };

      if (body.initialValue) {
        value = executeExpression(state, scope, body.initialValue);
      }

      if (scope.callstack.length === 0) {
        state.globalVariables.set(body.identifier, value);
      } else {
        //
      }
      break;
    }
    case AstNodeType.EXPRESSION:
      executeExpression(state, scope, body);
      break;
    case AstNodeType.FUNCTION_STATEMENT: {
      if (scope.callstack.length === 0) {
        state.globalVariables.set(body.functionName, {
          type: ValueType.FUNCTION,
          realization: FunctionRealization.JAVASCRIPT,
          declaration: body,
        });
      } else {
        //
      }
      break;
    }

    default:
      console.log('Statement ???', statement.body.type);
  }
}

function executeExpression(
  state: ProgramState,
  scope: Scope,
  expression: AstExpressionNode,
): Value {
  const { body } = expression;

  switch (body.type) {
    case AstNodeType.EXPRESSION:
      return executeExpression(state, scope, body);
    case AstNodeType.NUMBER_LITERAL:
      return {
        type: ValueType.NUMBER,
        value: body.value,
      };
    case AstNodeType.STRING_LITERAL:
      return {
        type: ValueType.STRING,
        value: body.value,
      };
    case AstNodeType.OBJECT_LITERAL:
      return {
        type: ValueType.OBJECT,
        fields: new Map(
          body.fields.map((field) => [
            executeField(state, scope, field.field),
            {
              value: executeExpression(state, scope, field.value),
              enumerable: true,
            },
          ]),
        ),
      };
    default:
      console.log('Expression ???', body);
  }

  return {
    type: ValueType.UNDEFINED,
  };
}

function executeField(state: ProgramState, scope: Scope, field: FieldNameNode) {
  switch (field.type) {
    case AstNodeType.IDENTIFIER:
      return field.value;
    case AstNodeType.STRING_LITERAL:
    case AstNodeType.NUMBER_LITERAL:
      return field.value.toString();
    case AstNodeType.EXPRESSION:
      return executeToString(
        state,
        scope,
        executeExpression(state, scope, field),
      );
  }
}

function executeToString(
  state: ProgramState,
  scope: Scope,
  value: Value,
): string {
  switch (value.type) {
    case ValueType.UNDEFINED:
      return 'undefined';
    case ValueType.STRING:
      return value.value;
    case ValueType.BOOLEAN:
      return value.value.toString();
    case ValueType.FUNCTION:
      throw new Error('Try to get string of function');
    case ValueType.NUMBER:
      return value.value.toString();
    case ValueType.OBJECT:
      return '[object Object]';
    default:
      throw new Error();
  }
}
