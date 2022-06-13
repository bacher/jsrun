import fs from 'fs';

import { parseJs } from './parser/parser';

const sourceCode = fs.readFileSync('example/program.js', 'utf-8');

const program = parseJs(sourceCode);

const programJson = JSON.stringify(program.statements, null, 2);

// console.log('Program:', programJson);
fs.writeFileSync('example/program.js.ast.json', programJson);
