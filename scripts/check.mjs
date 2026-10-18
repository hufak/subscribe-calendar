import { readFileSync, readdirSync } from 'node:fs';
import { compile } from 'svelte/compiler';

let failures = 0;
for (const name of readdirSync('src').filter(name => name.endsWith('.svelte'))) {
  const filename = `src/${name}`;
  const { warnings } = compile(readFileSync(filename, 'utf8'), { filename, generate: false });
  for (const warning of warnings) {
    console.error(`${filename}: ${warning.code}: ${warning.message}`);
    failures++;
  }
}
if (failures) process.exit(1);
console.log('Svelte compiler and accessibility diagnostics passed.');
