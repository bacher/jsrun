import { Point, Position } from './types';

export type LexemeType = StaticLexemeType | DynamicLexemeType;

export enum StaticLexemeType {
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
  STATEMENT_DELIMITER = 'STATEMENT_DELIMITER',
  LIST_DELIMITER = 'LIST_DELIMITER',
  COLON = 'COLON',
}

export enum DynamicLexemeType {
  IDENTIFIER = 'IDENTIFIER',
  STRING_LITERAL = 'STRING_LITERAL',
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  FIELD_ACCESS = 'FIELD_ACCESS',
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
  [StaticLexemeType.STATEMENT_DELIMITER]: ';',
  [StaticLexemeType.COLON]: ':',
  [StaticLexemeType.LIST_DELIMITER]: ',',
};

type IdentifierNode = {
  type: DynamicLexemeType.IDENTIFIER;
  value: string;
  pos: Position;
};

export type LexemeNode =
  | {
      type: StaticLexemeType;
      pos: Position;
    }
  | IdentifierNode
  | {
      type:
        | DynamicLexemeType.STRING_LITERAL
        | DynamicLexemeType.NUMBER_LITERAL
        | DynamicLexemeType.FIELD_ACCESS;
      value: string;
      pos: Position;
    };

const staticLexBackMatch = Object.fromEntries(
  Object.entries(staticLexMatch).map(([type, text]) => [text, type]),
) as Record<string, StaticLexemeType>;

export function getNextLexemeNode(
  code: string,
  point: Point,
): LexemeNode | undefined {
  if (point.charIndex >= code.length) {
    return undefined;
  }

  const rest = code.substring(point.charIndex);
  const char = code.charAt(point.charIndex);

  console.log('Parse:', rest.split('\n')[0]);

  if (/^[;(){}[\]]$/.test(char)) {
    return {
      type: staticLexBackMatch[char],
      pos: {
        charIndex: point.charIndex,
        charLength: 1,
      },
    };
  }

  const mathMatch = rest.match(/^([<>+*/=:,-]+)/);

  if (mathMatch) {
    const expression = mathMatch[0];

    const type = staticLexBackMatch[expression];

    if (!type) {
      throw parsingError(rest);
    }

    return {
      type,
      pos: {
        charIndex: point.charIndex,
        charLength: expression.length,
      },
    };
  }

  const identifierNode = parseIdentifier(code, point);
  if (identifierNode) {
    return identifierNode;
  }

  if (char === "'" || char === '"') {
    const stringStart = rest.substring(1);

    let stringMatch: RegExpMatchArray | null = null;

    if (char === "'") {
      stringMatch = stringStart.match(/^([^\n]*)(?<!\\)'/);
    } else if (char === '"') {
      stringMatch = stringStart.match(/^([^\n]*)(?<!\\)"/);
    }

    if (!stringMatch) {
      throw parsingError(rest);
    }

    const stringValue = stringMatch[1];

    return {
      type: DynamicLexemeType.STRING_LITERAL,
      value: stringValue,
      pos: {
        charIndex: point.charIndex,
        charLength: stringValue.length + 2,
      },
    };
  }

  if (/^\d/.test(char)) {
    const numberMatch = rest.match(/^\d+(?:\.\d+)?/);

    if (!numberMatch) {
      throw parsingError(rest);
    }

    const numberString = numberMatch[0];

    return {
      type: DynamicLexemeType.NUMBER_LITERAL,
      value: numberString,
      pos: {
        charIndex: point.charIndex,
        charLength: numberString.length,
      },
    };
  }

  if (char === '.') {
    if (/^\d/.test(rest.charAt(1))) {
      const valueRest = rest.substring(1);

      const numberMatch = valueRest.match(/^\d+/);
      const numberString = numberMatch![0];

      return {
        type: DynamicLexemeType.NUMBER_LITERAL,
        value: `0.${numberString}`,
        pos: {
          charIndex: point.charIndex,
          charLength: 1 + numberString.length,
        },
      };
    }

    const nextPoint = getNextPoint(code, {
      charIndex: point.charIndex + 1,
    });

    if (!nextPoint) {
      throw parsingError(rest);
    }

    const identifierNode = parseIdentifier(code, nextPoint);

    if (!identifierNode) {
      throw parsingError(rest);
    }

    return {
      type: DynamicLexemeType.FIELD_ACCESS,
      value: identifierNode.value,
      pos: {
        charIndex: point.charIndex,
        charLength:
          identifierNode.pos.charIndex -
          point.charIndex +
          identifierNode.pos.charLength,
      },
    };
  }

  throw parsingError(rest);
}

function parseIdentifier(
  code: string,
  point: Point,
): IdentifierNode | undefined {
  const rest = code.substring(point.charIndex);
  const identifierMatch = rest.match(/^[A-Za-z_][A-Za-z\d_]*/);

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

function getNextPoint(code: string, point: Point): Point | undefined {
  let charIndex = point.charIndex;

  while (charIndex < code.length && /\s/.test(code.charAt(charIndex))) {
    charIndex++;
  }

  return {
    charIndex,
  };
}

export function skipEmptySpace(code: string, point: Point) {
  const nextPoint = getNextPoint(code, point);

  if (nextPoint) {
    point.charIndex = nextPoint.charIndex;
  }
}

function parsingError(code: string): Error {
  return new Error(
    `Invalid symbols at: ${code.split('\n')[0].substring(0, 10)}`,
  );
}
