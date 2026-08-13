import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  ts = require('/usr/local/lib/node_modules/typescript/lib/typescript.js');
}

const roots = ['apps/web', 'apps/mobile'];
const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.expo', 'dist'].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(ent.name)) files.push(p);
  }
}
for (const root of roots) walk(root);

let bad = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  if (source.parseDiagnostics.length) {
    bad++;
    console.error(`\n${file}`);
    for (const d of source.parseDiagnostics) {
      const pos = source.getLineAndCharacterOfPosition(d.start || 0);
      console.error(
        `  ${pos.line + 1}:${pos.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`,
      );
    }
  }
}
if (bad) process.exit(1);
console.log(`Syntax check PASS — ${files.length} TS/TSX files parsed`);
