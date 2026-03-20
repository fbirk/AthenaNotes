import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version;

console.log(`Building CLI v${version}...`);

// 1. Bundle with esbuild
mkdirSync(resolve(rootDir, 'dist-cli'), { recursive: true });
mkdirSync(resolve(rootDir, 'release'), { recursive: true });

// Create empty shim for optional devtools dependency
const shimDir = resolve(rootDir, 'dist-cli/shims');
mkdirSync(shimDir, { recursive: true });
writeFileSync(resolve(shimDir, 'react-devtools-core.js'), 'export default {};\n');

console.log('Bundling with esbuild...');
await build({
  entryPoints: [resolve(rootDir, 'src/cli/index.js')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: resolve(rootDir, 'dist-cli/knowledgebase-cli.mjs'),
  banner: { js: 'import { createRequire as _cr } from "node:module"; const require = _cr(import.meta.url);' },
  define: {
    'process.env.KB_VERSION': JSON.stringify(version),
  },
  alias: {
    'react-devtools-core': resolve(shimDir, 'react-devtools-core.js'),
  },
});
console.log('Bundle created: dist-cli/knowledgebase-cli.mjs');

// 2. Create CJS wrapper that writes the ESM bundle to a temp file and imports it
// Node.js SEA runs embedded code as CJS. ESM code (with top-level await) can't
// run as CJS, so we write it to a temp .mjs file and dynamically import() it.
console.log('Creating SEA entry wrapper...');
const esmBundle = readFileSync(resolve(rootDir, 'dist-cli/knowledgebase-cli.mjs'), 'utf-8');
const encoded = Buffer.from(esmBundle).toString('base64');
const wrapper = `"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const tmp = path.join(os.tmpdir(), "knowledgebase-cli-" + process.pid + ".mjs");
fs.writeFileSync(tmp, Buffer.from(${JSON.stringify(encoded)}, "base64"));
import(require("node:url").pathToFileURL(tmp).href)
  .finally(() => { try { fs.unlinkSync(tmp); } catch {} });
`;
writeFileSync(resolve(rootDir, 'dist-cli/sea-entry.cjs'), wrapper);
console.log('SEA entry wrapper created');

// 3. Generate SEA blob
console.log('Generating SEA blob...');
execFileSync(process.execPath, [
  '--experimental-sea-config',
  resolve(rootDir, 'sea-config.json'),
], { cwd: rootDir, stdio: 'inherit' });
console.log('SEA blob created: dist-cli/sea-prep.blob');

// 4. Copy node.exe
const outputExe = resolve(rootDir, 'release/knowledgebase-cli-win-x64.exe');
console.log('Copying node.exe...');
copyFileSync(process.execPath, outputExe);

// 5. Remove signature (signtool not needed — postject handles unsigned binaries)
// On Windows, we need to remove the signature before injecting
try {
  execFileSync('signtool', ['remove', '/s', outputExe], { stdio: 'ignore' });
  console.log('Removed existing signature from exe');
} catch {
  // signtool not available or exe not signed — that's fine
  console.log('No signature to remove (or signtool not available)');
}

// 6. Inject SEA blob with postject
console.log('Injecting SEA blob into exe...');
execFileSync(process.execPath, [
  resolve(rootDir, 'node_modules/postject/dist/cli.js'),
  outputExe,
  'NODE_SEA_BLOB',
  resolve(rootDir, 'dist-cli/sea-prep.blob'),
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
], { cwd: rootDir, stdio: 'inherit' });

// 7. Report success
const stats = statSync(outputExe);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
console.log(`\nSuccess! CLI executable built: release/knowledgebase-cli-win-x64.exe (${sizeMB} MB)`);
