import {
  DynamicLexemeType,
  getNextLexemeNode,
  LexemeNode,
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

enum AstNodeType {
  DEFINE_VARIABLE = 'DEFINE_VARIABLE',
  EXPRESSION = 'EXPRESSION',
  STATEMENT = 'STATEMENT',
  IDENTIFIER = 'IDENTIFIER',
  FIELD_ACCESS = 'FIELD_ACCESS',
  CALL = 'CALL',
  STRING_LITERAL = 'STRING_LITERAL',
  SEQUENTIAL = 'SEQUENTIAL',
  FUNCTION_STATEMENT = 'FUNCTION_STATEMENT',
  SOURCE_FILE = 'SOURCE_FILE',
}

type AstNode =
  | AstDefineVariableNode
  | AstExpressionNode
  | AstFieldAccessNode
  | AstIdentifierNode
  | AstCallNode
  | AstStringLiteralNode
  | AstSequentialNode
  | AstFunctionStatementNode;

type AstDefineVariableNode = {
  type: AstNodeType.DEFINE_VARIABLE;
  variableModifier: DefType;
  identifier: string;
  initialValue: AstExpressionNode | undefined;
};

type AstExpressionNode = {
  type: AstNodeType.EXPRESSION;
  body: AstNode;
};

type AstStatementNode = {
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

type AstCallNode = {
  type: AstNodeType.CALL;
  host: AstNode;
  arguments: AstExpressionNode[];
};

type AstStringLiteralNode = {
  type: AstNodeType.STRING_LITERAL;
  value: string;
};

type AstSequentialNode = {
  type: AstNodeType.SEQUENTIAL;
  left: AstNode;
  right: AstNode;
};

type AstFunctionStatementNode = {
  type: AstNodeType.FUNCTION_STATEMENT;
  functionName: string;
  arguments: AstIdentifierNode[];
  body: AstStatementNode[];
};

type AstSourceFileNode = {
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

  throw parsingError(code, point);
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
  }

  if (!body) {
    throw parsingError(code, point);
  }

  return {
    type: AstNodeType.EXPRESSION,
    body,
  };
}

function parseNext(
  code: string,
  point: Point,
  node: AstNode,
  params: ParseExpressionOptions,
): AstNode {
  const lex = forceLookupNextLexemeNode(code, point);

  if (lex.type === StaticLexemeType.STATEMENT_DELIMITER) {
    // moveAfterLex(code, point, lex);
    return node;
  }

  if (lex.type === StaticLexemeType.ROUND_BRACKET_RIGHT) {
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
    .substring(point.charIndex - 5, 20)
    .replace(/\n/g, ' ');

  return new Error(`Invalid symbols at: ${codeExample}`);
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
function moveAfterLex(code: string, point: Point, node: LexemeNode) {
  point.charIndex = node.pos.charIndex + node.pos.charLength;
  skipEmptySpace(code, point);
}
