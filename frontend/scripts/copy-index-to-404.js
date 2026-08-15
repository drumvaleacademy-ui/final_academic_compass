import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const indexPath = resolve(root, 'dist', 'public', 'index.html');
const outPath = resolve(root, 'dist', 'public', '404.html');
try {
  const content = readFileSync(indexPath, 'utf8');
  writeFileSync(outPath, content, 'utf8');
  console.log('Copied index.html -> 404.html');
} catch (err) {
  console.error('Failed to copy index.html to 404.html', err);
  process.exit(1);
}
