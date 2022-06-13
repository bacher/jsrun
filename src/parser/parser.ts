import fs from 'fs';

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
}

type AstNode =
  | AstDefineVariableNode
  | AstExpressionNode
  | AstFieldAccessNode
  | AstIdentifierNode
  | AstCallNode
  | AstStringLiteralNode
  | AstSequentialNode;

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
  body: AstDefineVariableNode | AstExpressionNode;
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

export function parseJs(code: string) {
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

  const programJson = JSON.stringify(statements, null, 2);

  // console.log('Program:', programJson);
  fs.writeFileSync('out/program.ast.json', programJson);
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

  console.log('[DEF]', defType, identifierName, expr);

  return {
    type: AstNodeType.DEFINE_VARIABLE,
    variableModifier: defType,
    identifier: identifierName,
    initialValue: expr,
  };
}

function parseExpression(code: string, point: Point): AstExpressionNode {
  const lex = forceLookupNextLexemeNode(code, point);

  let body: AstNode | undefined;

  if (lex.type === DynamicLexemeType.STRING_LITERAL) {
    moveAfterLex(code, point, lex);

    body = parseNext(code, point, {
      type: AstNodeType.STRING_LITERAL,
      value: lex.value,
    });
  } else if (lex.type === DynamicLexemeType.IDENTIFIER) {
    // const iden = parseFullIdentifier(code, point);
    moveAfterLex(code, point, lex);
    body = parseNext(code, point, {
      type: AstNodeType.IDENTIFIER,
      value: lex.value,
    });
  }

  if (!body) {
    throw parsingError(code, point);
  }

  return {
    type: AstNodeType.EXPRESSION,
    body,
  };
}

function parseNext(code: string, point: Point, node: AstNode): AstNode {
  const lex = forceLookupNextLexemeNode(code, point);

  if (lex.type === StaticLexemeType.STATEMENT_DELIMITER) {
    // moveAfterLex(code, point, lex);
    return node;
  }

  if (lex.type === StaticLexemeType.ROUND_BRACKET_RIGHT) {
    return node;
  }

  if (lex.type === StaticLexemeType.LIST_DELIMITER) {
    moveAfterLex(code, point, lex);

    return {
      type: AstNodeType.SEQUENTIAL,
      left: node,
      right: parseExpression(code, point),
    };
  }

  if (lex.type === DynamicLexemeType.FIELD_ACCESS) {
    moveAfterLex(code, point, lex);
    return parseNext(code, point, {
      type: AstNodeType.FIELD_ACCESS,
      host: node,
      field: lex.value,
    });
  }

  if (lex.type === StaticLexemeType.ROUND_BRACKET_LEFT) {
    moveAfterLex(code, point, lex);

    const nextLex = forceLookupNextLexemeNode(code, point);

    const args = [];

    if (nextLex.type !== StaticLexemeType.ROUND_BRACKET_RIGHT) {
      args.push(parseExpression(code, point));
    }

    const callCloseLex = forceGetNextLexemeNode(code, point);

    if (callCloseLex.type !== StaticLexemeType.ROUND_BRACKET_RIGHT) {
      throw parsingError(code, point);
    }

    return parseNext(code, point, {
      type: AstNodeType.CALL,
      host: node,
      arguments: args,
    });
  }

  throw parsingError(code, point);
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
