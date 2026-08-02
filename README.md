# Postplan

An MCP server for anonymous, browser-viewable HTML projects. It stores project metadata in SQLite and assets on persistent local disk. The asset layer is behind `FileStorage`, so an S3 adapter can replace `LocalFileStorage` later.

## Run

```bash
npm install
npm run build
PUBLIC_BASE_URL=https://postplan.com PORT=3000 \
MCP_BASE_URL=http://127.0.0.1:3001 MCP_PORT=3001 npm start
```

Development:

```bash
npm run dev
```

Persistent state defaults to `./data` in the compiled app. Set `DATA_DIR=/var/lib/postplan` in production and back up both `postplan.db` and `assets/` together.

## MCP client setup

Point a Streamable HTTP MCP client at the separate MCP listener:

```text
https://mcp.postplan.internal/mcp
```

For local development: `http://localhost:3001/mcp`.

The viewer/index listener uses `PORT` (default `3000`). The MCP listener uses `MCP_PORT` (default `3001`). `PUBLIC_BASE_URL` is the viewer's externally reachable URL; `MCP_BASE_URL` is the MCP listener's externally reachable URL. Deploy them behind separate network policies or reverse proxies; do not route `/mcp` through the public viewer listener.

## Tools

- `create_project` — returns `project_id`, `write_key`, `read_key`, and `view_url`.
- `put_file` — create/update UTF-8 HTML, CSS, JS, or text files.
- `put_binary_file` — create/update a base64 binary asset, including images.
- `read_file` — get a file, selected line range, or literal/regex matching lines with context. Binary files are returned as base64.
- `apply_text_edits` — atomically replace exact, unique fragments in a text file.
- `list_files` — inspect uploaded files.
- `delete_file` — remove a file.
- `list_ui_skills` / `get_ui_skill` — discover and load vendored UI-design skills from [jakubkrehel/skills](https://github.com/jakubkrehel/skills), plus Postplan style directions (editorial, modern product, gallery, old internet, retro futurist, quiet minimal, and data lab).

The UI skills are vendored under `skills/jakubkrehel/` from that project's MIT-licensed source; its license is retained at `skills/jakubkrehel/LICENSE`.

`apply_text_edits` is safe for agent edits: every `old_text` must occur exactly once in the original file, and overlapping edits are rejected. Use `read_file` with `start_line`/`line_count` or `query`, `regex`, and `context_lines` to obtain enough context first.

The browser URL is:

```text
https://postplan.com/view?project_id=<project_id>&key=<read_key>
```

Use relative paths in `index.html`, e.g. `<link rel="stylesheet" href="style.css">` and `<img src="images/diagram.png">`.

## Security model

Keys are random 256-bit values. Only SHA-256 digests are stored in SQLite. The read key can only read; the write key can read and alter files. Do not put either key in logs. Hosted pages run in a sandboxed iframe, but project authors control their own JavaScript: only host content you trust.

Put both listeners behind TLS as appropriate. Configure the MCP reverse proxy to accept a 25 MB request body at minimum if binary uploads are needed. The viewer listener does not expose `/mcp`.

## Verify

```bash
npm test
npm run build
```
