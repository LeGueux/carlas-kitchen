import sharp from 'sharp';
import { randomFillSync } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
await mkdir('data', { recursive: true });
const pixels = randomFillSync(Buffer.alloc(2400 * 1800 * 3));
const result = await sharp(pixels, { raw: { width: 2400, height: 1800, channels: 3 } }).jpeg({ quality: 100 }).toFile('data/large-example.jpg');
console.log(`Generated a disposable noise image: ${result.size} bytes.`);
