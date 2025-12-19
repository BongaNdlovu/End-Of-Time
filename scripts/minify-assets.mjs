import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import postcss from 'postcss';
import cssnano from 'cssnano';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const cssTargets = [
    ['styles.css', 'styles.min.css'],
    ['dark-theme.css', 'dark-theme.min.css'],
    ['menu-styles.css', 'menu-styles.min.css'],
    ['menu-dark-theme.css', 'menu-dark-theme.min.css'],
    ['presentations-styles.css', 'presentations-styles.min.css']
];

const jsTargets = [
    ['script.js', 'script.min.js'],
    ['audio-manager.js', 'audio-manager.min.js'],
    ['app.js', 'app.min.js'],
    ['auth-leaderboard.js', 'auth-leaderboard.min.js'],
    ['menu.js', 'menu.min.js'],
    ['manifest-loader.js', 'manifest-loader.min.js'],
    ['level-video-map.js', 'level-video-map.min.js'],
    ['genesis-web-vitals.js', 'genesis-web-vitals.min.js'],
    ['presentations.js', 'presentations.min.js']
];

const ensureDir = async (filePath) => {
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });
};

const minifyCss = async ([inputRel, outputRel]) => {
    const inputPath = path.resolve(rootDir, inputRel);
    const outputPath = path.resolve(rootDir, outputRel);
    const source = await readFile(inputPath, 'utf8');
    const { css } = await postcss([cssnano()]).process(source, {
        from: inputPath,
        to: outputPath
    });
    await ensureDir(outputPath);
    await writeFile(outputPath, css, 'utf8');
    console.log(`Minified CSS: ${inputRel} -> ${outputRel} (${Buffer.byteLength(css)} bytes)`);
};

const minifyJs = async ([inputRel, outputRel]) => {
    const inputPath = path.resolve(rootDir, inputRel);
    const outputPath = path.resolve(rootDir, outputRel);
    await ensureDir(outputPath);
    await esbuild.build({
        entryPoints: [inputPath],
        outfile: outputPath,
        minify: true,
        bundle: false,
        sourcemap: false,
        format: 'iife',
        target: ['es2018'],
        logLevel: 'silent'
    });
    const result = await readFile(outputPath, 'utf8');
    console.log(`Minified JS: ${inputRel} -> ${outputRel} (${Buffer.byteLength(result)} bytes)`);
};

const run = async () => {
    try {
        await Promise.all(cssTargets.map(minifyCss));
        await Promise.all(jsTargets.map(minifyJs));
        console.log('Asset minification complete.');
    } catch (error) {
        console.error('Asset minification failed:', error);
        process.exitCode = 1;
    }
};

run();
