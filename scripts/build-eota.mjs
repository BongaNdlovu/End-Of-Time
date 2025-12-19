import { build } from 'esbuild';
import { rm, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CleanCSS from 'clean-css';
import { minify } from 'html-minifier-terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist', 'eota');

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'cmd.exe' : command;
    const cmdArgs = isWin ? ['/c', command, ...args] : args;
    const child = spawn(cmd, cmdArgs, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });

const npxCmd = 'npx';

async function ensureDist() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
}

async function buildTailwind() {
  const input = path.join(projectRoot, 'styles-input.css');
  const output = path.join(distDir, 'styles-compiled.css');
  await run(npxCmd, ['tailwindcss', '-i', input, '-o', output, '--minify']);
}

async function buildInlineCss() {
  const sourcePath = path.join(projectRoot, 'styles-inline.css');
  const outputPath = path.join(distDir, 'styles-inline.css');
  const source = await readFile(sourcePath, 'utf8');
  const minified = new CleanCSS({
    level: 2,
  }).minify(source);
  if (minified.errors.length > 0) {
    throw new Error(`CSS minification errors: ${minified.errors.join(', ')}`);
  }
  await writeFile(outputPath, minified.styles, 'utf8');
}

async function buildScripts() {
  await build({
    entryPoints: {
      core: path.join(projectRoot, 'src', 'eota', 'core-entry.js'),
      tabs: path.join(projectRoot, 'src', 'eota', 'tabs-entry.js'),
      analytics: path.join(projectRoot, 'src', 'eota', 'analytics-entry.js'),
    },
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: true,
    sourcemap: true,
    target: ['es2020'],
    outdir: distDir,
    entryNames: '[name]',
    chunkNames: 'chunks/[name]-[hash]',
    assetNames: 'assets/[name]-[hash]',
    logLevel: 'info',
  });
}

async function buildHtml() {
  const htmlPath = path.join(projectRoot, 'End Of Time Academy.html');
  const rawHtml = await readFile(htmlPath, 'utf8');
  const minified = await minify(rawHtml, {
    collapseWhitespace: true,
    removeComments: true,
    keepClosingSlash: true,
    minifyCSS: true,
    minifyJS: true,
  });
  const adjusted = minified.replace(/dist\/eota\//g, './');
  await writeFile(path.join(distDir, 'index.html'), adjusted, 'utf8');
}

async function copySourceMaps() {
  const mapDir = path.join(distDir, 'maps');
  await mkdir(mapDir, { recursive: true });
  const sourceMapFiles = [
    path.join(distDir, 'core.js.map'),
    path.join(distDir, 'tabs.js.map'),
    path.join(distDir, 'analytics.js.map'),
  ];
  await Promise.all(sourceMapFiles.map(async (file) => {
    try {
      const fileName = path.basename(file);
      await copyFile(file, path.join(mapDir, fileName));
    } catch (error) {
      // ignore missing maps (esbuild only writes when enabled)
    }
  }));
}

async function main() {
  console.log('🧹 Cleaning dist directory…');
  await ensureDist();

  console.log('🎨 Building Tailwind CSS…');
  await buildTailwind();

  console.log('🧵 Minifying custom styles…');
  await buildInlineCss();

  console.log('⚙️ Bundling JavaScript…');
  await buildScripts();

  console.log('📝 Minifying HTML…');
  await buildHtml();

  console.log('📦 Organising source maps…');
  await copySourceMaps();

  console.log('✅ End of Time Academy assets built to dist/eota');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
