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

## UI guidance workflow

Postplan exposes purpose-driven UI guidance in addition to its project file tools:

1. Resolve the page purpose, audience, primary task or takeaway, and content shape.
2. Call `list_layout_archetypes` and choose the page structure that matches that task.
3. Call `list_ui_skills` and choose one `style-*` visual direction.
4. Call `compose_ui_brief` with both selections. Its result is the implementation contract for hierarchy, tokens, component grammar, responsive behavior, and verification.
5. Use `list_ui_references` and `get_ui_reference` only when a specialist topic needs more depth. Use `get_ui_skill` for a complete top-level style or craft guide and `better-interface` for a holistic review.

The older `list_ui_skills` → `get_ui_skill` workflow remains supported, but composed briefs are preferred for new pages and material redesigns.

The viewer/index listener uses `PORT` (default `3000`). The MCP listener uses `MCP_PORT` (default `3001`). `PUBLIC_BASE_URL` is the viewer's externally reachable URL; `MCP_BASE_URL` is the MCP listener's externally reachable URL. Deploy them behind separate network policies or reverse proxies; do not route `/mcp` through the public viewer listener.

## Tools

- `create_project` — returns `project_id`, `write_key`, `read_key`, and `view_url`.
- `put_file` — create/update UTF-8 HTML, CSS, JS, or text files.
- `put_binary_file` — create/update a base64 binary asset, including images.
- `read_file` — get a file, selected line range, or literal matching lines with context. Binary files are returned as base64.
- `apply_text_edits` — atomically replace exact, unique fragments in a text file.
- `list_files` — inspect uploaded files.
- `delete_file` — remove a file.
- `list_layout_archetypes` — discover purpose-driven structures for marketing, application, onboarding, settings, editorial, dashboard, collection, and plan pages.
- `list_ui_skills` / `get_ui_skill` — discover and load vendored UI-design skills from [jakubkrehel/skills](https://github.com/jakubkrehel/skills), plus Postplan style directions (editorial, modern product, gallery, old internet, retro futurist, quiet minimal, and data lab).
- `compose_ui_brief` — combine intent, one layout archetype, and one style into concise build guidance and a cohesion checklist.
- `list_ui_references` / `get_ui_reference` — retrieve the detailed Markdown references linked by the specialist skills.

The UI skills are vendored under `skills/jakubkrehel/` from that project's MIT-licensed source; its license is retained at `skills/jakubkrehel/LICENSE`.

`apply_text_edits` is safe for agent edits: every `old_text` must occur exactly once in the original file, and overlapping edits are rejected. Use `read_file` with `start_line`/`line_count` or a literal `query` and `context_lines` to obtain enough context first.

The browser URL is:

```text
https://postplan.com/view?project_id=<project_id>&key=<read_key>
```

Use relative paths in `index.html`, e.g. `<link rel="stylesheet" href="style.css">` and `<img src="images/diagram.png">`.

## Security model

Keys are random 256-bit values. Only SHA-256 digests are stored in SQLite. The read key can only read; the write key can read and alter files. Do not put either key in logs. Hosted pages receive a sandboxing CSP whether viewed in the viewer iframe or opened directly, but project authors still control their own JavaScript: only host content you trust.

Put both listeners behind TLS as appropriate. Configure the MCP reverse proxy to accept a 25 MB request body at minimum if binary uploads are needed. The viewer listener does not expose `/mcp`.

## Verify

```bash
npm test
npm run build
```
