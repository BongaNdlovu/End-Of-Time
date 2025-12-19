import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const targets = [
  'Fear God.png',
];

async function convertOne(file) {
  const abs = path.join(projectRoot, file);
  const dir = path.dirname(abs);
  const base = path.basename(file, path.extname(file));
  const webpOut = path.join(dir, `${base}.webp`);
  const avifOut = path.join(dir, `${base}.avif`);
  try {
    const input = sharp(abs);
    await input.webp({ quality: 80 }).toFile(webpOut);
  } catch (e) {
    console.error('WEBP conversion failed for', file, e.message);
  }
  try {
    const input = sharp(abs);
    await input.avif({ quality: 55 }).toFile(avifOut);
  } catch (e) {
    console.error('AVIF conversion failed for', file, e.message);
  }
}

async function main() {
  for (const t of targets) {
    await convertOne(t);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
