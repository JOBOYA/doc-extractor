#!/usr/bin/env node
'use strict';

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const arg = process.argv[2];

async function main() {
  if (arg === 'uninstall') {
    require('../installer/setup.js').uninstall();
    return;
  }

  if (arg !== 'start') {
    // install first (idempotent)
    require('../installer/setup.js').install();
  }

  startServer();
}

function startServer() {
  const standaloneServer = path.join(ROOT, '.next', 'standalone', 'server.js');
  const hasStandalone = fs.existsSync(standaloneServer);

  console.log('\n🔌 Doc Extractor — starting UI on http://localhost:3000\n');

  let proc;

  if (hasStandalone) {
    // Production mode: pre-built standalone
    proc = spawn('node', [standaloneServer], {
      cwd: ROOT,
      env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' },
      stdio: 'inherit',
    });
  } else {
    // Dev fallback: npx next dev
    proc = spawn('npx', ['next', 'dev', '-p', '3000'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
  }

  // Open browser after a short delay
  setTimeout(() => openBrowser('http://localhost:3000'), 2500);

  proc.on('exit', (code) => process.exit(code ?? 0));
  process.on('SIGINT', () => proc.kill('SIGINT'));
  process.on('SIGTERM', () => proc.kill('SIGTERM'));
}

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'win32') execSync(`start "" "${url}"`);
    else if (platform === 'darwin') execSync(`open "${url}"`);
    else execSync(`xdg-open "${url}"`);
  } catch {}
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
