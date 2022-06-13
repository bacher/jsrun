import fs from 'fs';

import { parseJs } from './parser/parser';
import { runSourceFile } from './engine/jsrun';

const sourceCode = fs.readFileSync('example/program.js', 'utf-8');

console.log('===== PARSE =====');

const program = parseJs(sourceCode);

console.log('=====  RUN  =====');

runSourceFile(program);

const programJson = JSON.stringify(program.statements, null, 2);

// console.log('Program:', programJson);
fs.writeFileSync('example/program.js.ast.json', programJson);
