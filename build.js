#!/usr/bin/env node

/**
 * Build script for ftnQuoter extension
 * Creates XPI file for distribution
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const OUTPUT_FILE = 'ftnquoter-2.0.2.xpi';
const BUILD_DIR = path.join(__dirname);

// Files and directories to exclude from the build
const EXCLUDE = [
  'node_modules',
  'build.js',
  'package.json',
  'package-lock.json',
  '.git',
  '.gitignore',
  '.DS_Store',
  OUTPUT_FILE,
  'icons/create-icons.html',
  'icons/README.txt',
  'icons/*.svg'
];

function shouldInclude(filePath) {
  const relativePath = path.relative(BUILD_DIR, filePath);

  return !EXCLUDE.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(relativePath);
    }
    return relativePath === pattern || relativePath.startsWith(pattern + path.sep);
  });
}

function createXPI() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(BUILD_DIR, OUTPUT_FILE));
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      console.log(`✓ Created ${OUTPUT_FILE} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    // Add files recursively
    function addDirectory(dir) {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (!shouldInclude(filePath)) {
          return;
        }

        if (stat.isDirectory()) {
          addDirectory(filePath);
        } else {
          const relativePath = path.relative(BUILD_DIR, filePath);
          archive.file(filePath, { name: relativePath });
          console.log(`  + ${relativePath}`);
        }
      });
    }

    console.log('Building XPI...\n');
    addDirectory(BUILD_DIR);

    archive.finalize();
  });
}

// Check if archiver is installed
try {
  require.resolve('archiver');
} catch (e) {
  console.error('Error: archiver module not found.');
  console.error('Please run: npm install');
  process.exit(1);
}

// Build
createXPI()
  .then(() => {
    console.log('\n✓ Build complete!');
    console.log(`\nTo install in Thunderbird:`);
    console.log(`1. Open Thunderbird`);
    console.log(`2. Go to Menu → Add-ons and Themes`);
    console.log(`3. Click gear icon → Install Add-on From File`);
    console.log(`4. Select ${OUTPUT_FILE}`);
  })
  .catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
