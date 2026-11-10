import { cpSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

for (const name of readdirSync(dist)) {
  if (name.endsWith('.html')) cpSync(join(dist, name), join(root, name));
}
rmSync(join(root, 'assets'), { recursive: true, force: true });
cpSync(join(dist, 'assets'), join(root, 'assets'), { recursive: true });
for (const stale of ['app.js', 'styles.css', 'sw.js']) {
  rmSync(join(root, stale), { force: true });
}
console.log('Published dist HTML + assets to repo root.');
