'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOKS_DIR = path.join(__dirname, '..', 'mcp');
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const QUEUE_DIR = path.join(CLAUDE_DIR, 'doc-extractor-queue');
const CLAUDE_HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');

const HOOK_SCRIPTS = ['hook-inject-context.sh', 'hook-mark-done.sh', 'hook-session-start.sh'];

const QUEUE_WATCHER_SRC = path.join(__dirname, '..', 'bin', 'queue-watcher.sh');
const QUEUE_WATCHER_DEST = path.join(CLAUDE_HOOKS_DIR, 'doc-extractor-queue-watcher.sh');

// Hooks to inject into settings.json
// Use forward slashes — on Windows, bash interprets backslashes as escape chars
const toForwardSlash = (p) => p.replace(/\\/g, '/');

const HOOKS_TO_ADD = {
  SessionStart: {
    command: `bash "${toForwardSlash(path.join(CLAUDE_HOOKS_DIR, 'hook-session-start.sh'))}"`,
    timeout: 5,
  },
  UserPromptSubmit: {
    command: `bash "${toForwardSlash(path.join(CLAUDE_HOOKS_DIR, 'hook-inject-context.sh'))}"`,
    timeout: 5,
  },
  Stop: {
    command: `bash "${toForwardSlash(path.join(CLAUDE_HOOKS_DIR, 'hook-mark-done.sh'))}"`,
    timeout: 5,
  },
};

function install() {
  console.log('📦 Doc Extractor — setting up Claude Code integration...\n');

  // 1. Create directories
  [QUEUE_DIR, CLAUDE_HOOKS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✓ Created ${dir}`);
    }
  });

  // 2. Copy hook scripts
  HOOK_SCRIPTS.forEach((name) => {
    const src = path.join(HOOKS_DIR, name);
    const dest = path.join(CLAUDE_HOOKS_DIR, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, 0o755);
      console.log(`  ✓ Installed hook: ${name}`);
    }
  });

  // 3. Copy queue-watcher.sh (from bin/)
  const watcherSrc = path.join(__dirname, '..', 'bin', 'queue-watcher.sh');
  if (fs.existsSync(watcherSrc)) {
    fs.copyFileSync(watcherSrc, QUEUE_WATCHER_DEST);
    fs.chmodSync(QUEUE_WATCHER_DEST, 0o755);
    console.log(`  ✓ Installed queue watcher`);
  }

  // 4. Patch ~/.claude/settings.json
  patchSettings();

  console.log('\n✅ Setup complete! Claude Code will now auto-detect UI requests.\n');
}

function patchSettings() {
  if (!fs.existsSync(CLAUDE_DIR)) {
    console.warn('  ⚠️  ~/.claude not found — is Claude Code installed?');
    return;
  }

  let settings = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch {}
  }

  if (!settings.hooks) settings.hooks = {};

  let changed = false;

  for (const [event, { command, timeout }] of Object.entries(HOOKS_TO_ADD)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    const already = settings.hooks[event].some(
      (entry) => entry.hooks?.some?.((h) => h.command === command)
    );

    if (!already) {
      settings.hooks[event].push({ matcher: '', hooks: [{ type: 'command', command, timeout }] });
      changed = true;
      console.log(`  ✓ Registered ${event} hook`);
    } else {
      console.log(`  · ${event} hook already present`);
    }
  }

  if (changed) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  }
}

function uninstall() {
  console.log('🗑️  Doc Extractor — removing Claude Code integration...\n');

  // Remove hook scripts
  [...HOOK_SCRIPTS, 'doc-extractor-queue-watcher.sh'].forEach((name) => {
    const file = path.join(CLAUDE_HOOKS_DIR, name);
    if (fs.existsSync(file)) {
      fs.rmSync(file);
      console.log(`  ✓ Removed ${name}`);
    }
  });

  // Remove queue dir
  if (fs.existsSync(QUEUE_DIR)) {
    fs.rmSync(QUEUE_DIR, { recursive: true });
    console.log(`  ✓ Removed queue directory`);
  }

  // Patch out hooks from settings.json
  if (fs.existsSync(SETTINGS_FILE)) {
    let settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    for (const [event, { command }] of Object.entries(HOOKS_TO_ADD)) {
      if (settings.hooks?.[event]) {
        settings.hooks[event] = settings.hooks[event].filter(
          (entry) => !entry.hooks?.some?.((h) => h.command === command)
        );
      }
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log(`  ✓ Removed hooks from settings.json`);
  }

  console.log('\n✅ Uninstalled.\n');
}

module.exports = { install, uninstall };
