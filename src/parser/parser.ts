type Point = {
  charIndex: number;
};

type Position = {
  charIndex: number;
  charLength: number;
};

type LexemeType = StaticLexemeType | DynamicLexemeType;

enum StaticLexemeType {
  ROUND_BRACKET_LEFT = 'ROUND_BRACKET_LEFT',
  ROUND_BRACKET_RIGHT = 'ROUND_BRACKET_RIGHT',
  SQUARE_BRACKET_LEFT = 'SQUARE_BRACKET_LEFT',
  SQUARE_BRACKET_RIGHT = 'SQUARE_BRACKET_RIGHT',
  CURLY_BRACKET_LEFT = 'CURLY_BRACKET_LEFT',
  CURLY_BRACKET_RIGHT = 'CURLY_BRACKET_RIGHT',
  MATH_ASSIGN = 'MATH_ASSIGN',
  MATH_LESS = 'MATH_LESS',
  MATH_MORE = 'MATH_MORE',
  MATH_EQUAL_LESS = 'MATH_EQUAL_LESS',
  MATH_EQUAL_MORE = 'MATH_EQUAL_MORE',
  MATH_EQUALS = 'MATH_EQUALS',
  MATH_STRICT_EQUALS = 'MATH_STRICT_EQUALS',
  MATH_PLUS_ASSIGN = 'MATH_PLUS_ASSIGN',
  MATH_MINUS_ASSIGN = 'MATH_MINUS_ASSIGN',
  MATH_INC = 'MATH_INC',
  MATH_DEC = 'MATH_DEC',
  MATH_MUL_ASSIGN = 'MATH_MUL_ASSIGN',
  MATH_DIV_ASSIGN = 'MATH_DIV_ASSIGN',
}

enum DynamicLexemeType {
  IDENTIFIER = 'IDENTIFIER',
}

const staticLexMatch = {
  [StaticLexemeType.CURLY_BRACKET_LEFT]: '{',
  [StaticLexemeType.CURLY_BRACKET_RIGHT]: '}',
  [StaticLexemeType.SQUARE_BRACKET_LEFT]: '[',
  [StaticLexemeType.SQUARE_BRACKET_RIGHT]: ']',
  [StaticLexemeType.ROUND_BRACKET_LEFT]: '(',
  [StaticLexemeType.ROUND_BRACKET_RIGHT]: ')',
  [StaticLexemeType.MATH_ASSIGN]: '=',
  [StaticLexemeType.MATH_EQUALS]: '==',
  [StaticLexemeType.MATH_STRICT_EQUALS]: '===',
  [StaticLexemeType.MATH_LESS]: '<',
  [StaticLexemeType.MATH_MORE]: '>',
  [StaticLexemeType.MATH_EQUAL_LESS]: '<=',
  [StaticLexemeType.MATH_EQUAL_MORE]: '>=',
  [StaticLexemeType.MATH_PLUS_ASSIGN]: '+=',
  [StaticLexemeType.MATH_MINUS_ASSIGN]: '-=',
  [StaticLexemeType.MATH_MUL_ASSIGN]: '*=',
  [StaticLexemeType.MATH_DIV_ASSIGN]: '/=',
  [StaticLexemeType.MATH_INC]: '++',
  [StaticLexemeType.MATH_DEC]: '--',
};

type LexemeNode =
  | {
      type: StaticLexemeType;
      pos: Position;
    }
  | {
      type: DynamicLexemeType.IDENTIFIER;
      value: string;
      pos: Position;
    };

const staticLexBackMatch = Object.fromEntries(
  Object.entries(staticLexMatch).map(([type, text]) => [text, type]),
) as Record<string, StaticLexemeType>;

export function parseJs(code: string) {
  const point: Point = {
    charIndex: 0,
  };

  let lex: LexemeNode | undefined;

  while ((lex = getNextLexemeNode(code, point))) {
    console.log('Lex:', lex.type);
    point.charIndex = lex.pos.charIndex + lex.pos.charLength;
    skipEmptySpace(code, point);
  }

  return;

  // while (point.charIndex < code.length) {
  skipEmptySpace(code, point);
  parseStatement(code, point);
  // }
}

function getNextLexemeNode(code: string, point: Point): LexemeNode | undefined {
  const rest = code.substring(point.charIndex);
  const char = code.charAt(point.charIndex);

  if (/^[(){}[\]]$/.test(char)) {
    return {
      type: staticLexBackMatch[char],
      pos: {
        charIndex: point.charIndex,
        charLength: 1,
      },
    };
  }

  const mathMatch = rest.match(/^([<>+*/=-]+)/);

  if (mathMatch) {
    const expression = mathMatch[0];

    const type = staticLexBackMatch[expression];

    if (!type) {
      throw new Error(
        `Invalid symbols at: ${rest.split('\n')[0].substring(0, 10)}`,
      );
    }

    return {
      type,
      pos: {
        charIndex: point.charIndex,
        charLength: expression.length,
      },
    };
  }

  const identifierMatch = rest.match(/^[\w_][\w\d_]*/);

  if (identifierMatch) {
    const identifier = identifierMatch[0];

    return {
      type: DynamicLexemeType.IDENTIFIER,
      value: identifier,
      pos: {
        charIndex: point.charIndex,
        charLength: identifier.length,
      },
    };
  }

  return undefined;
}

function skipEmptySpace(code: string, point: Point) {
  while (
    point.charIndex < code.length &&
    /\s/.test(code.charAt(point.charIndex))
  ) {
    point.charIndex++;
  }
}

function parseStatement(code: string, point: Point) {
  const starting = code.substring(point.charIndex, point.charIndex + 10);

  const defMatch = starting.match(/^(var|let|const)\b/);

  if (defMatch) {
    const defVar = defMatch[1];
    point.charIndex += defVar.length;

    skipEmptySpace(code, point);

    parseDefVarStatement(code, point, defVar.trim());
  }
}

function assertText(code: string, point: Point, test: RegExp): string {
  const match = code.substring(point.charIndex).match(test);

  if (!match) {
    throw new Error('Assert failed');
  }

  const found = match[0];

  point.charIndex += found.length;

  return found;
}

function parseDefVarStatement(code: string, point: Point, defType: string) {
  const varName = parseIdentifier(code, point);

  assertText(code, point, /^=\s/);
  skipEmptySpace(code, point);

  const expr = parseExpression(code, point);

  console.log('[DEF]', defType, varName, expr);
}

function getLine(code: string, point: Point) {
  const nextNewLineIndex = code.indexOf('\n', point.charIndex);

  if (nextNewLineIndex === -1) {
    return code.substring(point.charIndex);
  }

  return code.substring(point.charIndex, nextNewLineIndex);
}

function parseIdentifier(code: string, point: Point) {
  const line = getLine(code, point);

  const identifierMatch = line.match(/^[\w_$][\w_$\d]*\b/);

  if (!identifierMatch) {
    throw new Error('Invalid identifier');
  }

  const identifierName = identifierMatch[0];

  point.charIndex += identifierName.length;

  skipEmptySpace(code, point);

  return identifierName.trim();
}

function parseExpression(code: string, point: Point) {
  const firstChar = code.charAt(point.charIndex);

  if (firstChar === '"' || firstChar === "'") {
    const line = getLine(code, point);

    const fakeCodedLine = line.replaceAll("\\'", '__').replaceAll('\\"', '__');

    const stringEndIndex = fakeCodedLine.indexOf(firstChar, 1);

    if (stringEndIndex === -1) {
      throw new Error('Invalid string literal');
    }

    const value = code.substring(
      point.charIndex + 1,
      point.charIndex + stringEndIndex,
    );

    point.charIndex += value.length + 2;

    skipEmptySpace(code, point);

    return {
      type: 'StringLiteral',
      value,
    };
  }
}
