import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { messages } from '../src/i18n/messages.js';
const unchanged = new Set(['Sur Shakti', 'Sur Shakti Connect', 'Sur Shakti Residency', 'Sur Shakti Society', 'Surshakti Residence', '· Sur Shakti Residency', 'Connect', 'UPI', 'Amitbhai', 'Shitalbhai', 'Full Name | Email | Flat No | Phone']);
const missing = new Set();
const unsafe = [];
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && ['uiText', 't'].includes(node.callee.name) && node.arguments[0]?.type === 'StringLiteral') {
    const key = node.arguments[0].value;
    if (!messages[key.trim().toLowerCase()] && !unchanged.has(key)) missing.add(key);
  }
  if (node.type === 'JSXAttribute' && ['value', 'key'].includes(node.name?.name) && ['uiText', 't'].includes(node.value?.expression?.callee?.name)) unsafe.push(`Do not translate ${node.name.name} at line ${node.loc.start.line}`);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'extra', 'comments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(walk);
    else if (value?.type) walk(value);
  }
}
for (const file of fs.readdirSync('src', { recursive: true }).filter(file => /\.(jsx|js)$/.test(file) && !file.startsWith('i18n'))) {
  walk(parse(fs.readFileSync(path.join('src', file), 'utf8'), { sourceType: 'module', plugins: ['jsx'] }));
}
console.log(JSON.stringify([...missing].sort(), null, 2));
if (unsafe.length) console.error(unsafe.join('\n'));
if (missing.size || unsafe.length) process.exitCode = 1;
