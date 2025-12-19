import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import postcss from 'postcss';
import cssnano from 'cssnano';
import { minify } from 'terser';

const rootDir = process.cwd();

async function buildStyles() {
  const inputPath = path.resolve(rootDir, 'styles1.css');
  const outputPath = path.resolve(rootDir, 'styles1.min.css');
  const css = await readFile(inputPath, 'utf8');
  const result = await postcss([cssnano()]).process(css, {
    from: inputPath,
    to: outputPath,
    map: { inline: false }
  });

  await writeFile(outputPath, result.css);
  if (result.map) {
    await writeFile(`${outputPath}.map`, result.map.toString());
  }
}

async function buildScripts() {
  const inputPath = path.resolve(rootDir, 'app.js');
  const outputPath = path.resolve(rootDir, 'app.min.js');
  const js = await readFile(inputPath, 'utf8');
  const result = await minify(js, {
    compress: true,
    mangle: true,
    sourceMap: {
      filename: path.basename(outputPath),
      url: 'app.min.js.map'
    }
  });

  if (!result.code) {
    throw new Error('Terser did not return JavaScript output.');
  }

  await writeFile(outputPath, result.code);
  if (result.map) {
    await writeFile(`${outputPath}.map`, result.map);
  }
}

async function run() {
  await buildStyles();
  await buildScripts();
  console.log('index1 assets rebuilt.');
}

run().catch((error) => {
  console.error('Failed to build index1 assets:', error);
  process.exitCode = 1;
});
