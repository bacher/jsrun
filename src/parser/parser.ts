import { getNextLexemeNode, LexemeNode, skipEmptySpace } from './lex';
import { Point } from './types';

export function parseJs(code: string) {
  const point: Point = {
    charIndex: 0,
  };

  let lex: LexemeNode | undefined;

  while ((lex = getNextLexemeNode(code, point))) {
    console.log('Lex:', lex.type, (lex as any).value);
    point.charIndex = lex.pos.charIndex + lex.pos.charLength;
    skipEmptySpace(code, point);
  }

  return;

  // while (point.charIndex < code.length) {
  skipEmptySpace(code, point);
  parseStatement(code, point);
  // }
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
  const varName = parseIdentifier2(code, point);

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

function parseIdentifier2(code: string, point: Point) {
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
