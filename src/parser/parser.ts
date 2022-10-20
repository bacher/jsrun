import {
  DynamicLexemeType,
  getNextLexemeNode,
  LexemeNode,
  LexemeType,
  skipEmptySpace,
  StaticLexemeType,
} from './lex';
import { Point } from './types';

const keywords = [
  'for',
  'while',
  'if',
  'switch',
  'case',
  'const',
  'let',
  'var',
  'function',
  'class',
  'import',
  'export',
];

export enum AstNodeType {
  DEFINE_VARIABLE = 'DEFINE_VARIABLE',
  EXPRESSION = 'EXPRESSION',
  STATEMENT = 'STATEMENT',
  IDENTIFIER = 'IDENTIFIER',
  FIELD_ACCESS = 'FIELD_ACCESS',
  INDEXED_FIELD_ACCESS = 'INDEXED_FIELD_ACCESS',
  CALL = 'CALL',
  STRING_LITERAL = 'STRING_LITERAL',
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  SEQUENTIAL = 'SEQUENTIAL',
  FUNCTION_STATEMENT = 'FUNCTION_STATEMENT',
  ARROW_FUNCTION = 'ARROW_FUNCTION',
  SOURCE_FILE = 'SOURCE_FILE',
  OBJECT_LITERAL = 'OBJECT_LITERAL',
  OBJECT_DESTRUCTURING = 'OBJECT_DESTRUCTURING',
  ASSIGN = 'ASSIGN',
  OBJECT_DESTRUCTURING_FIELD = 'OBJECT_DESTRUCTURING_FIELD',
  ARGUMENTS_LIST = 'ARGUMENTS_LIST',
  ARGUMENT = 'ARGUMENT',
}

type AstNode =
  | AstDefineVariableNode
  | AstAssignNode
  | AstExpressionNode
  | AstFieldAccessNode
  | AstIdentifierNode
  | AstCallNode
  | AstStringLiteralNode
  | AstNumberLiteralNode
  | AstSequentialNode
  | AstFunctionStatementNode
  | AstArrowFunctionNode
  | AstObjectLiteralNode
  | AstIndexedFieldAccessNode
  | AstObjectDestructuringNode
  | AstArgumentsListNode;

type AstDefineVariableNode = {
  type: AstNodeType.DEFINE_VARIABLE;
  variableModifier: DefType;
  identifier: string;
  initialValue: AstExpressionNode | undefined;
};

export type AstExpressionNode = {
  type: AstNodeType.EXPRESSION;
  body: AstNode;
};

export type AstStatementNode = {
  type: AstNodeType.STATEMENT;
  body: AstDefineVariableNode | AstExpressionNode | AstFunctionStatementNode;
};

type AstIdentifierNode = {
  type: AstNodeType.IDENTIFIER;
  value: string;
};

type AstFieldAccessNode = {
  type: AstNodeType.FIELD_ACCESS;
  host: AstNode;
  field: string;
};

type AstIndexedFieldAccessNode = {
  type: AstNodeType.INDEXED_FIELD_ACCESS;
  host: AstNode;
  fieldExpression: AstExpressionNode;
};

type AstCallNode = {
  type: AstNodeType.CALL;
  host: AstNode;
  arguments: AstExpressionNode[];
};

type AstStringLiteralNode = {
  type: AstNodeType.STRING_LITERAL;
  value: string;
};

type AstNumberLiteralNode = {
  type: AstNodeType.NUMBER_LITERAL;
  value: number;
};

type AstSequentialNode = {
  type: AstNodeType.SEQUENTIAL;
  left: AstNode;
  right: AstNode;
};

export type AstFunctionStatementNode = {
  type: AstNodeType.FUNCTION_STATEMENT;
  functionName: string;
  arguments: AstIdentifierNode[];
  body: AstStatementNode[];
};

export type AstObjectDestructuringNode = {
  type: AstNodeType.OBJECT_DESTRUCTURING;
  fields: AstObjectDestructuringFieldNode[];
};

export type AstAssignNode = {
  type: AstNodeType.ASSIGN;
  target: AstIdentifierNode | AstObjectDestructuringNode;
  expression: AstExpressionNode;
};

export type AstArgumentNode = {
  type: AstNodeType.ARGUMENT;
  argument: AstIdentifierNode | AstObjectDestructuringNode;
  value?: AstExpressionNode;
};

export type AstObjectDestructuringFieldNode = {
  type: AstNodeType.OBJECT_DESTRUCTURING_FIELD;
  sourceField: AstIdentifierNode;
  destination: AstIdentifierNode | AstObjectDestructuringNode;
};

export type AstArgumentsListNode = {
  type: AstNodeType.ARGUMENTS_LIST;
  arguments: AstArgumentNode[];
};

export type AstArrowFunctionNode = {
  type: AstNodeType.ARROW_FUNCTION;
  arguments: AstArgumentsListNode;
  body: AstExpressionNode | AstStatementNode[];
};

export type FieldNameNode =
  | AstIdentifierNode
  | AstStringLiteralNode
  | AstNumberLiteralNode
  | AstExpressionNode;

export type AstFieldKeyValueNode = {
  field: FieldNameNode;
  value: AstExpressionNode;
};

type AstObjectLiteralNode = {
  type: AstNodeType.OBJECT_LITERAL;
  fields: AstFieldKeyValueNode[];
};

export type AstSourceFileNode = {
  type: AstNodeType.SOURCE_FILE;
  statements: AstStatementNode[];
};

enum DefType {
  VAR = 'VAR',
  CONST = 'CONST',
  LET = 'LET',
}

const defVarMatch: Record<string, DefType | undefined> = {
  var: DefType.VAR,
  let: DefType.LET,
  const: DefType.CONST,
};

export function parseJs(code: string): AstSourceFileNode {
  const point: Point = {
    charIndex: 0,
  };

  // let lex: LexemeNode | undefined;
  //
  // while ((lex = getNextLexemeNode(code, point))) {
  //   console.log('Lex:', lex.type, (lex as any).value);
  //   point.charIndex = lex.pos.charIndex + lex.pos.charLength;
  //   skipEmptySpace(code, point);
  // }
  //
  // return;

  const statements: AstStatementNode[] = [];

  while (point.charIndex < code.length) {
    skipEmptySpace(code, point);

    if (point.charIndex < code.length) {
      statements.push(parseStatement(code, point));
    }
  }

  return {
    type: AstNodeType.SOURCE_FILE,
    statements,
  };
}

function parseStatement(code: string, point: Point): AstStatementNode {
  const lex = forceLookupNextLexemeNode(code, point);

  if (lex.type === DynamicLexemeType.IDENTIFIER) {
    switch (lex.value) {
      case 'var':
      case 'const':
      case 'let':
        return {
          type: AstNodeType.STATEMENT,
          body: parseDefVarStatement(code, point),
        };
      case 'function':
        return {
          type: AstNodeType.STATEMENT,
          body: parseFunctionDeclaration(code, point),
        };
      case 'class':
      case 'for':
      case 'while':
      case 'if':
      case 'switch':
      case 'case':
      case 'import':
      case 'export':
        throw new Error();
      default:
        const body = parseExpression(code, point);
        const nextLex = forceGetNextLexemeNode(code, point);

        if (nextLex.type !== StaticLexemeType.STATEMENT_DELIMITER) {
          throw parsingError(code, point);
        }

        return {
          type: AstNodeType.STATEMENT,
          body,
        };
    }
  }

  const expressionStatement: AstStatementNode = {
    type: AstNodeType.STATEMENT,
    body: parseExpression(code, point),
  };

  skipSemiColons(code, point);

  return expressionStatement;
}

function skipSemiColons(code: string, point: Point): void {
  while (true) {
    const nextLex = getNextLexemeNode(code, point);

    if (!nextLex || nextLex.type !== StaticLexemeType.STATEMENT_DELIMITER) {
      break;
    }

    moveAfterLex(code, point, nextLex);
  }
}

function parseDefVarStatement(
  code: string,
  point: Point,
): AstDefineVariableNode {
  const defLex = forceGetNextLexemeNode(code, point);

  if (defLex.type !== DynamicLexemeType.IDENTIFIER) {
    throw parsingError(code, point);
  }

  const defType = defVarMatch[defLex.value];

  if (!defType) {
    throw parsingError(code, point);
  }

  const lex = forceGetNextLexemeNode(code, point);

  if (lex.type !== DynamicLexemeType.IDENTIFIER) {
    throw parsingError(code, point);
  }

  if (keywords.includes(lex.value)) {
    throw parsingError(code, point);
  }

  const identifierName = lex.value;

  const nextLex = forceGetNextLexemeNode(code, point);

  let expr: AstExpressionNode | undefined;

  if (nextLex.type === StaticLexemeType.MATH_ASSIGN) {
    expr = parseExpression(code, point);
    const endLex = forceGetNextLexemeNode(code, point);
    if (endLex.type !== StaticLexemeType.STATEMENT_DELIMITER) {
      throw parsingError(code, point);
    }
  } else if (defType === DefType.CONST) {
    throw parsingError(code, point);
  } else if (nextLex.type !== StaticLexemeType.STATEMENT_DELIMITER) {
    throw parsingError(code, point);
  }

  return {
    type: AstNodeType.DEFINE_VARIABLE,
    variableModifier: defType,
    identifier: identifierName,
    initialValue: expr,
  };
}

type ParseExpressionOptions = { stopOnListDelimiter?: boolean };

function parseExpression(
  code: string,
  point: Point,
  params: ParseExpressionOptions = {},
): AstExpressionNode {
  const lex = forceLookupNextLexemeNode(code, point);

  let body: AstNode | undefined;

  if (lex.type === DynamicLexemeType.STRING_LITERAL) {
    moveAfterLex(code, point, lex);

    body = parseNext(
      code,
      point,
      {
        type: AstNodeType.STRING_LITERAL,
        value: lex.value,
      },
      params,
    );
  } else if (lex.type === DynamicLexemeType.NUMBER_LITERAL) {
    moveAfterLex(code, point, lex);

    body = parseNext(
      code,
      point,
      {
        type: AstNodeType.NUMBER_LITERAL,
        value: Number.parseFloat(lex.value),
      },
      params,
    );
  } else if (lex.type === DynamicLexemeType.IDENTIFIER) {
    moveAfterLex(code, point, lex);
    body = parseNext(
      code,
      point,
      {
        type: AstNodeType.IDENTIFIER,
        value: lex.value,
      },
      params,
    );
  } else if (lex.type === StaticLexemeType.CURLY_BRACKET_LEFT) {
    let field: AstObjectLiteralNode | AstAssignNode = parseObjectLiteral(
      code,
      point,
    );

    const nextLex = forceLookupNextLexemeNode(code, point);
    if (nextLex.type === StaticLexemeType.MATH_ASSIGN) {
      moveAfterLex(code, point, nextLex);
      const value = parseExpression(code, point, { stopOnListDelimiter: true });

      field = {
        type: AstNodeType.ASSIGN,
        target: convertToDestructuring(field),
        expression: value,
      };
    }

    body = parseNext(code, point, field, params);
  } else if (lex.type === StaticLexemeType.ROUND_BRACKET_LEFT) {
    moveAfterLex(code, point, lex);

    body = parseExpression(code, point);

    const ending = forceLookupNextLexemeNode(code, point);

    if (ending.type !== StaticLexemeType.ROUND_BRACKET_RIGHT) {
      throw parsingError(code, point);
    }

    moveAfterLex(code, point, ending);

    const nextLex = getNextLexemeNode(code, point);

    console.log('nextLex', nextLex);

    if (nextLex && nextLex.type === StaticLexemeType.LAMBDA_ARROW) {
      moveAfterLex(code, point, nextLex);

      const argumentsNode = convertToArgumentsList(body);

      const bodyStartLex = forceLookupNextLexemeNode(code, point);

      let arrowBody: AstExpressionNode | AstStatementNode[];

      if (bodyStartLex.type === StaticLexemeType.CURLY_BRACKET_LEFT) {
        arrowBody = parseStatementBlock(code, point);
      } else {
        arrowBody = parseExpression(code, point);
      }

      body = {
        type: AstNodeType.ARROW_FUNCTION,
        arguments: argumentsNode,
        body: arrowBody,
      };
    }
  }

  if (!body) {
    throw parsingError(code, point);
  }

  return {
    type: AstNodeType.EXPRESSION,
    body,
  };
}

function convertToDestructuring(
  astNode: AstObjectLiteralNode,
): AstObjectDestructuringNode {
  const fields: AstObjectDestructuringFieldNode[] = astNode.fields.map(
    (field) => {
      let destination: AstIdentifierNode | AstObjectDestructuringNode;

      if (field.field.type !== AstNodeType.IDENTIFIER) {
        throw new Error();
      }

      if (field.value.body.type === AstNodeType.IDENTIFIER) {
        destination = field.value.body;
      } else if (field.value.body.type === AstNodeType.OBJECT_LITERAL) {
        destination = convertToDestructuring(field.value.body);
      } else {
        throw new Error();
      }

      return {
        type: AstNodeType.OBJECT_DESTRUCTURING_FIELD,
        sourceField: field.field,
        destination,
      };
    },
  );

  return {
    type: AstNodeType.OBJECT_DESTRUCTURING,
    fields,
  };
}

function unwrapExpression(astNode: AstNode): AstNode {
  if (astNode.type === AstNodeType.EXPRESSION) {
    return astNode.body;
  }

  return astNode;
}

function sequentise(astNode: AstNode): AstNode[] {
  if (astNode.type !== AstNodeType.SEQUENTIAL) {
    return [astNode];
  }

  return [astNode.left, ...sequentise(unwrapExpression(astNode.right))];
}

function convertToArgumentsList(astNode: AstNode): AstArgumentsListNode {
  console.log('===', JSON.stringify(astNode, null, 2));

  if (astNode.type !== AstNodeType.EXPRESSION) {
    throw new Error('Should be expression');
  }

  return {
    type: AstNodeType.ARGUMENTS_LIST,
    arguments: sequentise(astNode.body).map((astNode) => {
      if (astNode.type === AstNodeType.IDENTIFIER) {
        return {
          type: AstNodeType.ARGUMENT,
          argument: astNode,
        };
      }

      if (astNode.type === AstNodeType.OBJECT_LITERAL) {
        return {
          type: AstNodeType.ARGUMENT,
          argument: convertToDestructuring(astNode),
        };
      }

      if (astNode.type === AstNodeType.ASSIGN) {
        if (
          astNode.target.type !== AstNodeType.IDENTIFIER &&
          astNode.target.type !== AstNodeType.OBJECT_DESTRUCTURING
        ) {
          throw new Error();
        }

        return {
          type: AstNodeType.ARGUMENT,
          argument: astNode.target,
          value: astNode.expression,
        };
      }

      throw new Error(`Unsuitable lexem ${astNode.type}`);
    }),
  };
}

function convertLiteralToAst(
  lex: LexemeNode,
): AstIdentifierNode | AstStringLiteralNode | AstNumberLiteralNode {
  switch (lex.type) {
    case DynamicLexemeType.IDENTIFIER:
      return {
        type: AstNodeType.IDENTIFIER,
        value: lex.value,
      };
    case DynamicLexemeType.NUMBER_LITERAL:
      return {
        type: AstNodeType.NUMBER_LITERAL,
        value: Number.parseFloat(lex.value),
      };
    case DynamicLexemeType.STRING_LITERAL:
      return {
        type: AstNodeType.STRING_LITERAL,
        value: lex.value,
      };
    default:
      throw new Error(`Invalid type ${lex.type}`);
  }
}

function parseObjectLiteral(code: string, point: Point): AstObjectLiteralNode {
  const startObjectLex = forceGetNextLexemeNode(code, point);

  if (startObjectLex.type !== StaticLexemeType.CURLY_BRACKET_LEFT) {
    throw parsingError(code, point);
  }

  const fields: AstFieldKeyValueNode[] = [];

  while (true) {
    const fieldNameLex = forceGetNextLexemeNode(code, point);

    if (fieldNameLex.type === StaticLexemeType.CURLY_BRACKET_RIGHT) {
      break;
    }

    let fieldName: AstNode;
    let potentialBody: AstIdentifierNode | undefined;

    if (fieldNameLex.type === StaticLexemeType.SQUARE_BRACKET_LEFT) {
      fieldName = parseExpression(code, point);

      ensureNextLex(code, point, StaticLexemeType.SQUARE_BRACKET_RIGHT);
    } else if (
      fieldNameLex.type === DynamicLexemeType.IDENTIFIER ||
      fieldNameLex.type === DynamicLexemeType.STRING_LITERAL ||
      fieldNameLex.type === DynamicLexemeType.NUMBER_LITERAL
    ) {
      fieldName = convertLiteralToAst(fieldNameLex);

      if (fieldNameLex.type === DynamicLexemeType.IDENTIFIER) {
        potentialBody = {
          type: AstNodeType.IDENTIFIER,
          value: fieldNameLex.value,
        };
      }
    } else {
      throw parsingError(code, point);
    }

    const nextLex = forceGetNextLexemeNode(code, point);

    let value: AstExpressionNode;
    let stop = false;

    if (
      nextLex.type === StaticLexemeType.CURLY_BRACKET_RIGHT ||
      nextLex.type === StaticLexemeType.LIST_DELIMITER
    ) {
      if (!potentialBody) {
        throw parsingError(code, point);
      }

      value = {
        type: AstNodeType.EXPRESSION,
        body: potentialBody,
      };
      stop = nextLex.type === StaticLexemeType.CURLY_BRACKET_RIGHT;
    } else if (nextLex.type === StaticLexemeType.COLON) {
      value = parseExpression(code, point, { stopOnListDelimiter: true });

      const nextLex = forceLookupNextLexemeNode(code, point);

      if (nextLex.type !== StaticLexemeType.CURLY_BRACKET_RIGHT) {
        if (nextLex.type === StaticLexemeType.LIST_DELIMITER) {
          moveAfterLex(code, point, nextLex);
        } else {
          throw parsingError(code, point);
        }
      }
    } else {
      throw parsingError(code, point);
    }

    fields.push({
      field: fieldName,
      value,
    });

    if (stop) {
      break;
    }
  }

  return {
    type: AstNodeType.OBJECT_LITERAL,
    fields,
  };
}

function parseNext(
  code: string,
  point: Point,
  node: AstNode,
  params: ParseExpressionOptions,
): AstNode {
  const lex = forceLookupNextLexemeNode(code, point);

  if (
    lex.type === StaticLexemeType.STATEMENT_DELIMITER ||
    lex.type === StaticLexemeType.ROUND_BRACKET_RIGHT ||
    lex.type === StaticLexemeType.SQUARE_BRACKET_RIGHT ||
    lex.type === StaticLexemeType.CURLY_BRACKET_RIGHT
  ) {
    return node;
  }

  if (lex.type === StaticLexemeType.LIST_DELIMITER) {
    if (params.stopOnListDelimiter) {
      return node;
    }

    moveAfterLex(code, point, lex);

    return {
      type: AstNodeType.SEQUENTIAL,
      left: node,
      right: parseExpression(code, point),
    };
  }

  if (lex.type === DynamicLexemeType.FIELD_ACCESS) {
    moveAfterLex(code, point, lex);
    return parseNext(
      code,
      point,
      {
        type: AstNodeType.FIELD_ACCESS,
        host: node,
        field: lex.value,
      },
      params,
    );
  }

  if (lex.type === StaticLexemeType.SQUARE_BRACKET_LEFT) {
    moveAfterLex(code, point, lex);

    const expression = parseExpression(code, point);

    const endLex = forceGetNextLexemeNode(code, point);

    if (endLex.type !== StaticLexemeType.SQUARE_BRACKET_RIGHT) {
      throw parsingError(code, point);
    }

    return parseNext(
      code,
      point,
      {
        type: AstNodeType.INDEXED_FIELD_ACCESS,
        host: node,
        fieldExpression: expression,
      },
      params,
    );
  }

  if (lex.type === StaticLexemeType.ROUND_BRACKET_LEFT) {
    moveAfterLex(code, point, lex);

    const args = parseCallArguments(code, point);

    const callCloseLex = forceGetNextLexemeNode(code, point);

    if (callCloseLex.type !== StaticLexemeType.ROUND_BRACKET_RIGHT) {
      throw parsingError(code, point);
    }

    return parseNext(
      code,
      point,
      {
        type: AstNodeType.CALL,
        host: node,
        arguments: args,
      },
      params,
    );
  }

  throw parsingError(code, point);
}

function parseCallArguments(code: string, point: Point): AstExpressionNode[] {
  const args: AstExpressionNode[] = [];

  while (true) {
    const lex = forceLookupNextLexemeNode(code, point);

    if (lex.type === StaticLexemeType.ROUND_BRACKET_RIGHT) {
      break;
    }

    if (lex.type === StaticLexemeType.LIST_DELIMITER) {
      moveAfterLex(code, point, lex);
    }

    args.push(parseExpression(code, point, { stopOnListDelimiter: true }));
  }

  return args;
}

function parseFunctionDeclaration(
  code: string,
  point: Point,
): AstFunctionStatementNode {
  const funcLex = forceGetNextLexemeNode(code, point);

  if (
    funcLex.type !== DynamicLexemeType.IDENTIFIER ||
    funcLex.value !== 'function'
  ) {
    throw parsingError(code, point);
  }

  const funcNameLex = forceGetNextLexemeNode(code, point);

  if (funcNameLex.type !== DynamicLexemeType.IDENTIFIER) {
    throw parsingError(code, point);
  }

  const args = parseArgumentsList(code, point);

  const codeBlock = parseStatementBlock(code, point);

  return {
    type: AstNodeType.FUNCTION_STATEMENT,
    functionName: funcNameLex.value,
    arguments: args,
    body: codeBlock,
  };
}

function parseArgumentsList(code: string, point: Point): AstIdentifierNode[] {
  const argsStartLex = forceGetNextLexemeNode(code, point);

  if (argsStartLex.type !== StaticLexemeType.ROUND_BRACKET_LEFT) {
    throw parsingError(code, point);
  }

  const nextLex = forceLookupNextLexemeNode(code, point);

  if (nextLex.type === StaticLexemeType.ROUND_BRACKET_RIGHT) {
    moveAfterLex(code, point, nextLex);
    return [];
  }

  const lex = forceLookupNextLexemeNode(code, point);

  if (lex.type !== DynamicLexemeType.IDENTIFIER) {
    throw parsingError(code, point);
  }

  const args: AstIdentifierNode[] = [
    {
      type: AstNodeType.IDENTIFIER,
      value: lex.value,
    },
  ];

  while (true) {
    const lex = forceGetNextLexemeNode(code, point);

    if (lex.type === StaticLexemeType.ROUND_BRACKET_RIGHT) {
      break;
    }

    if (lex.type === StaticLexemeType.LIST_DELIMITER) {
      const idLex = forceGetNextLexemeNode(code, point);

      if (idLex.type !== DynamicLexemeType.IDENTIFIER) {
        throw parsingError(code, point);
      }

      args.push({
        type: AstNodeType.IDENTIFIER,
        value: idLex.value,
      });
    }
  }

  return args;
}

function parseStatementBlock(code: string, point: Point): AstStatementNode[] {
  const startLex = forceGetNextLexemeNode(code, point);

  if (startLex.type !== StaticLexemeType.CURLY_BRACKET_LEFT) {
    throw parsingError(code, point);
  }

  const statements: AstStatementNode[] = [];

  while (true) {
    const nextLex = forceLookupNextLexemeNode(code, point);

    if (nextLex.type === StaticLexemeType.CURLY_BRACKET_RIGHT) {
      moveAfterLex(code, point, nextLex);
      break;
    }

    statements.push(parseStatement(code, point));
  }

  return statements;
}

/*
function parseFullIdentifier(
  code: string,
  point: Point,
): AstFullIdentifierNode {
  const lex = forceGetNextLexemeNode(code, point);

  if (
    lex.type !== DynamicLexemeType.IDENTIFIER ||
    keywords.includes(lex.value)
  ) {
    throw parsingError(code, point);
  }

  const identifier = {
    type: AstNodeType.IDENTIFIER,
    value: lex.value,
  };

  const path: AstFieldAccessNode[] = [];

  while (true) {
    const nextLex = forceLookupNextLexemeNode(code, point);

    if (nextLex.type === DynamicLexemeType.FIELD_ACCESS) {
      path.push({
        type: AstNodeType.FIELD_ACCESS,
        value: nextLex.value,
      });
      moveAfterLex(code, point, nextLex);
    } else {
      break;
    }
  }

  return {
    type: AstNodeType.FULL_IDENTIFIER,
    identifier,
    path,
  };
}
*/

function parsingError(code: string, point: Point): Error {
  const codeExample = code
    .substring(point.charIndex - 5, point.charIndex + 15)
    .replace(/\n/g, ' ');

  console.error(`Error at: ${codeExample}\n${' '.repeat(15)}^`);

  const lex = forceLookupNextLexemeNode(code, point);

  return new Error(`Invalid symbols at :${point.charIndex} ${lex.type}`);
}

function forceLookupNextLexemeNode(code: string, point: Point): LexemeNode {
  const node = getNextLexemeNode(code, point);

  if (!node) {
    throw new Error('Unexpected end of code');
  }

  return node;
}

function forceGetNextLexemeNode(code: string, point: Point): LexemeNode {
  const node = forceLookupNextLexemeNode(code, point);

  point.charIndex = node.pos.charIndex + node.pos.charLength;

  skipEmptySpace(code, point);

  return node;
}

function ensureNextLex(code: string, point: Point, lexType: LexemeType): void {
  const lex = forceGetNextLexemeNode(code, point);

  if (lex.type !== lexType) {
    throw new Error(`Next lexeme should be ${lexType} but see ${lex.type}`);
  }
}

function moveAfterLex(code: string, point: Point, node: LexemeNode) {
  point.charIndex = node.pos.charIndex + node.pos.charLength;
  skipEmptySpace(code, point);
}
