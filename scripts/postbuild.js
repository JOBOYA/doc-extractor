'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = path.join(ROOT, '.next', 'static');
const dest = path.join(ROOT, '.next', 'standalone', '.next', 'static');

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
  console.log('✓ Copied .next/static → .next/standalone/.next/static');
}
