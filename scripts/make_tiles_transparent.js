#!/usr/bin/env node
/**
 * Post-process ORI tiles to make white backgrounds transparent.
 * Uses sharp for fast image processing.
 *
 * Usage: node make_tiles_transparent.js [tiles_dir]
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const tilesDir = process.argv[2] || 'public/tiles';

async function findAllPngs(dir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.png')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

async function makeWhiteTransparent(filePath) {
  try {
    const image = sharp(filePath);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;

    // Process pixels - make white (or near-white) transparent
    const threshold = 250;
    const newData = Buffer.alloc(width * height * 4); // RGBA output

    for (let i = 0; i < width * height; i++) {
      const srcOffset = i * channels;
      const dstOffset = i * 4;

      const r = data[srcOffset];
      const g = data[srcOffset + 1];
      const b = data[srcOffset + 2];
      const a = channels === 4 ? data[srcOffset + 3] : 255;

      // Check if pixel is white/near-white
      if (r >= threshold && g >= threshold && b >= threshold) {
        // Make transparent
        newData[dstOffset] = r;
        newData[dstOffset + 1] = g;
        newData[dstOffset + 2] = b;
        newData[dstOffset + 3] = 0; // Transparent
      } else {
        // Keep original
        newData[dstOffset] = r;
        newData[dstOffset + 1] = g;
        newData[dstOffset + 2] = b;
        newData[dstOffset + 3] = a;
      }
    }

    // Save back
    await sharp(newData, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(filePath + '.tmp');

    // Replace original
    fs.renameSync(filePath + '.tmp', filePath);

    return true;
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    return false;
  }
}

async function main() {
  console.log(`Processing tiles in: ${tilesDir}`);

  if (!fs.existsSync(tilesDir)) {
    console.error(`Directory not found: ${tilesDir}`);
    process.exit(1);
  }

  const files = await findAllPngs(tilesDir);
  console.log(`Found ${files.length} PNG files`);

  let processed = 0;
  let errors = 0;

  for (const file of files) {
    const success = await makeWhiteTransparent(file);
    if (success) {
      processed++;
      if (processed % 10 === 0) {
        process.stdout.write(`\rProcessed ${processed}/${files.length} tiles...`);
      }
    } else {
      errors++;
    }
  }

  console.log(`\nDone! Processed ${processed} tiles, ${errors} errors`);
}

main().catch(console.error);
