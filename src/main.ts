import { parseJs } from './parser/parser';

parseJs(`const a = 'Hello';
let b;
var c;
var k = "world";

console.log(a);

function sayHello(text) {
  console.log("Hello");
  console.log(text);
}

sayHello('Kek');
`);
