# doc-extractor

Crawl documentation sites and pipe them into your Claude Code terminal.

You point it at a docs URL, it extracts every page as markdown, and one click sends the content into your active Claude Code session so you can code against it in your own project.

## Install

```bash
npx doc-extractor
```

This starts a local UI on `http://localhost:3000` and installs three hooks into `~/.claude/settings.json` so Claude Code can receive extractions.

## Use

1. Open your project, start Claude Code (`claude`) in its terminal.
2. Open `http://localhost:3000` and paste a docs URL.
3. When the crawl finishes, click **Send to Claude** on any page (or the whole extraction).
4. Type anything in your Claude terminal — the extracted docs are injected into your prompt and Claude answers grounded in them, with access to your project files.

## How it works

```
┌─────────────┐    writes queue    ┌──────────────┐
│   UI (:3000)│ ─────────────────> │ ~/.claude/   │
└─────────────┘                    │ doc-extractor│
                                   │ -queue/      │
                                   └──────┬───────┘
                                          │ read by UserPromptSubmit hook
                                          ▼
                                   ┌──────────────┐
                                   │ Claude Code  │
                                   │ (your term)  │
                                   └──────────────┘
```

The crawler uses `cheerio` + `turndown` and runs entirely on your machine. Nothing is sent to a third-party service.

## Requirements

- Node 18+
- Claude Code installed and on PATH
- `bash` available (Git Bash on Windows, built-in on macOS/Linux)

## Uninstall

```bash
npx doc-extractor uninstall
```

Removes hooks, scripts and the queue directory. Your extractions history is kept in `~/.claude/doc-extractor-history/`.

## License

MIT
