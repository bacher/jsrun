import fs from 'fs';
import { takeRightWhile } from 'lodash';

import { parseJs } from './parser/parser';
import { runSourceFile } from './engine/jsrun';

const argParams: Record<string, boolean> = {};

for (const str of takeRightWhile(process.argv, (str) => str.startsWith('--'))) {
  argParams[str.replace(/^--/, '')] = true;
}

const sourceCode = fs.readFileSync('example/program.js', 'utf-8');

console.log('===== PARSE =====');

const program = parseJs(sourceCode);

if (!argParams.parse) {
  console.log('=====  RUN  =====');
  runSourceFile(program);
}

const programJson = JSON.stringify(program.statements, null, 2);

// console.log('Program:', programJson);
fs.writeFileSync('example/program.js.ast.json', programJson);
